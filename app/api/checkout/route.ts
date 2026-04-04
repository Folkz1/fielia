import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  ACTIVE_ASAAS_SUBSCRIPTION_STATUSES,
  formatAsaasDate,
  getOpenPaymentForSubscription,
  resolvePlanValue,
  upsertAsaasPaymentRecord,
} from '@/lib/billing';

export const runtime = 'nodejs';

const CHECKOUT_BILLING_TYPE = 'CREDIT_CARD' as const;

function generatePassword() {
  return crypto.randomBytes(9).toString('base64');
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function normalizeCpf(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function mapCheckoutError(error: unknown) {
  const anyError = error as {
    message?: string;
    code?: string;
    asaasErrors?: Array<{ description?: string }>;
  };
  const asaasDetails = (anyError?.asaasErrors || [])
    .map((item) => item.description || '')
    .join(' ')
    .toLowerCase();
  const message = String(anyError?.message || '').toLowerCase();
  const detail = `${message} ${asaasDetails}`;

  if (anyError?.code === 'P2002' || detail.includes('unique constraint')) {
    if (detail.includes('cpf')) {
      return NextResponse.json(
        { error: 'Este CPF já está vinculado a outra conta.' },
        { status: 409 }
      );
    }

    if (detail.includes('phone') || detail.includes('telefone')) {
      return NextResponse.json(
        { error: 'Este WhatsApp já está vinculado a outra conta.' },
        { status: 409 }
      );
    }

    if (detail.includes('email')) {
      return NextResponse.json(
        { error: 'Este email já está vinculado a outra conta.' },
        { status: 409 }
      );
    }
  }

  if (detail.includes('cpf')) {
    return NextResponse.json(
      { error: 'CPF inválido. Verifique os dados e tente novamente.' },
      { status: 400 }
    );
  }

  if (detail.includes('telefone') || detail.includes('phone')) {
    return NextResponse.json(
      { error: 'WhatsApp inválido. Verifique os dados e tente novamente.' },
      { status: 400 }
    );
  }

  if (detail.includes('email')) {
    return NextResponse.json(
      { error: 'Email inválido. Verifique os dados e tente novamente.' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Erro ao processar checkout. Tente novamente.' },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const email = normalizeEmail(body?.email);
    const phoneDigits = normalizePhone(body?.phone);
    const cpfDigits = normalizeCpf(body?.cpf);

    if (!name || !email || !cpfDigits || !phoneDigits) {
      return NextResponse.json(
        { error: 'Nome, email, CPF e WhatsApp são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    if (cpfDigits.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve conter 11 dígitos.' },
        { status: 400 }
      );
    }

    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: 'WhatsApp inválido.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpfCnpj: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
      },
    });

    const phoneConflict = await prisma.user.findFirst({
      where: {
        phone: phoneDigits,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true },
    });

    if (phoneConflict) {
      return NextResponse.json(
        { error: 'Este WhatsApp já está vinculado a outra conta.' },
        { status: 409 }
      );
    }

    const cpfConflict = await prisma.user.findFirst({
      where: {
        cpfCnpj: cpfDigits,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true },
    });

    if (cpfConflict) {
      return NextResponse.json(
        { error: 'Este CPF já está vinculado a outra conta.' },
        { status: 409 }
      );
    }

    if (existing?.isPremium && (!existing.subscriptionEnd || existing.subscriptionEnd > now)) {
      return NextResponse.json(
        { error: 'Este email já possui uma assinatura Premium ativa.' },
        { status: 409 }
      );
    }

    const planValue = resolvePlanValue();

    if (existing?.asaasSubscriptionId) {
      try {
        const existingSubscription = await getOpenPaymentForSubscription(existing.asaasSubscriptionId);
        const existingStatus = String(existingSubscription.subscription?.status || '').toUpperCase();
        const existingPayment = existingSubscription.payment;

        if (existingPayment?.id) {
          if (!existing.asaasCustomerId) {
            throw new Error('Asaas customer missing for existing subscription');
          }

          await upsertAsaasPaymentRecord({
            userId: existing.id,
            asaasCustomerId: existing.asaasCustomerId,
            asaasSubscriptionId: existing.asaasSubscriptionId,
            payment: existingPayment,
            fallbackBillingType: CHECKOUT_BILLING_TYPE,
            fallbackValue: planValue,
          });

          return NextResponse.json({
            reusedSubscription: true,
            invoiceUrl: existingPayment.invoiceUrl || null,
            paymentId: existingPayment.id || null,
            status: existingPayment.status || existingStatus || 'PENDING',
            dueDate: existingPayment.dueDate || existingSubscription.subscription?.nextDueDate || null,
            subscriptionId: existing.asaasSubscriptionId,
            subscriptionState:
              String(existingPayment.status || '').toUpperCase() === 'OVERDUE'
                ? 'overdue'
                : 'pending_payment',
          });
        }

        if (ACTIVE_ASAAS_SUBSCRIPTION_STATUSES.has(existingStatus)) {
          const localPending = await prisma.asaasPayment.findFirst({
            where: {
              userId: existing.id,
              asaasSubscriptionId: existing.asaasSubscriptionId,
              status: { in: ['PENDING', 'AWAITING_RISK_ANALYSIS', 'OVERDUE'] },
            },
            orderBy: { dueDate: 'asc' },
            select: {
              asaasPaymentId: true,
              status: true,
              dueDate: true,
              invoiceUrl: true,
            },
          });

          if (localPending?.invoiceUrl) {
            return NextResponse.json({
              reusedSubscription: true,
              invoiceUrl: localPending.invoiceUrl,
              paymentId: localPending.asaasPaymentId,
              status: localPending.status,
              dueDate: localPending.dueDate?.toISOString() || null,
              subscriptionId: existing.asaasSubscriptionId,
              subscriptionState: localPending.status === 'OVERDUE' ? 'overdue' : 'pending_payment',
            });
          }
        }
      } catch (error) {
        console.warn('[Checkout] Falha ao inspecionar assinatura existente:', error);
      }
    }

    let userId = existing?.id || '';
    let asaasCustomerId = existing?.asaasCustomerId || null;

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          phone: phoneDigits,
          cpfCnpj: cpfDigits,
        },
      });
      userId = existing.id;
    } else {
      const hashedPassword = await bcrypt.hash(generatePassword(), 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          phone: phoneDigits,
          cpfCnpj: cpfDigits,
          password: hashedPassword,
        },
        select: { id: true },
      });
      userId = newUser.id;
    }

    if (!asaasCustomerId) {
      const customer = await asaasClient.createCustomer({
        name,
        email,
        cpfCnpj: cpfDigits,
        mobilePhone: phoneDigits,
      });
      asaasCustomerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId },
      });
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const subscription = await asaasClient.createSubscription({
      customer: asaasCustomerId!,
      billingType: CHECKOUT_BILLING_TYPE,
      value: planValue,
      nextDueDate: formatAsaasDate(tomorrow),
      cycle: 'MONTHLY',
      description: 'FIEL.IA Premium Mensal',
      externalReference: `user:${userId}`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        asaasSubscriptionId: subscription.id,
        isPremium: false,
        subscriptionEnd: null,
      },
    });

    let firstPayment = null;
    try {
      const { payment } = await getOpenPaymentForSubscription(subscription.id);
      firstPayment = payment;
    } catch (err) {
      console.warn('[Checkout] Não foi possível buscar o primeiro pagamento via helper:', err);
    }

    if (!firstPayment) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const paymentsResponse = await asaasClient.listSubscriptionPayments(subscription.id);
          firstPayment = paymentsResponse?.data?.[0] || null;
          if (firstPayment?.invoiceUrl) break;
        } catch (err) {
          console.warn(`[Checkout] Tentativa ${attempt + 1} - falha ao buscar invoiceUrl:`, err);
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (firstPayment?.id) {
      await upsertAsaasPaymentRecord({
        userId,
        asaasCustomerId: asaasCustomerId!,
        asaasSubscriptionId: subscription.id,
        payment: firstPayment,
        fallbackBillingType: CHECKOUT_BILLING_TYPE,
        fallbackValue: planValue,
      });
    }

    if (!firstPayment?.invoiceUrl) {
      console.error('[Checkout] invoiceUrl não retornado. subscription.id:', subscription.id);
      return NextResponse.json(
        { error: 'Não foi possível gerar o link de pagamento. Tente novamente em alguns instantes.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reusedSubscription: false,
      invoiceUrl: firstPayment.invoiceUrl,
      paymentId: firstPayment.id || null,
      status: firstPayment.status || subscription.status,
      dueDate: firstPayment.dueDate || subscription.nextDueDate,
      subscriptionId: subscription.id,
      subscriptionState:
        String(firstPayment.status || '').toUpperCase() === 'OVERDUE'
          ? 'overdue'
          : 'pending_payment',
    });
  } catch (error) {
    console.error('[Checkout] Erro:', (error as Error)?.message || error);
    return mapCheckoutError(error);
  }
}
