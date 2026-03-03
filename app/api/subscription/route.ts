import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';

export const runtime = 'nodejs';

const OPEN_STATUSES = new Set(['PENDING', 'AWAITING_RISK_ANALYSIS', 'OVERDUE']);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'OVERDUE']);
const SUBSCRIPTION_BILLING_TYPE = 'CREDIT_CARD' as const;

type AsaasPaymentData = {
  id?: string;
  status?: string;
  billingType?: string;
  value?: number | string;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  creditDate?: string;
  invoiceUrl?: string | null;
  description?: string | null;
  externalReference?: string | null;
};

function formatAsaasDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function parseAsaasDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolvePlanValue() {
  const parsed = Number(process.env.ASAAS_SUBSCRIPTION_VALUE || '56.90');
  if (!Number.isFinite(parsed) || parsed <= 0) return 56.9;
  return parsed;
}

function generateValidCpf(seed: string) {
  // Deterministic pseudo-random digits from seed (dev/sandbox only)
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const digits: number[] = [];
  for (let i = 0; i < 9; i++) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    digits.push(Math.abs(hash) % 10);
  }

  const calcCheck = (base: number[]) => {
    const weightStart = base.length + 1;
    const sum = base.reduce((acc, digit, idx) => acc + digit * (weightStart - idx), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcCheck(digits);
  const d2 = calcCheck([...digits, d1]);

  return [...digits, d1, d2].join('');
}

async function upsertPaymentRecord(params: {
  userId: string;
  asaasCustomerId: string;
  asaasSubscriptionId: string;
  payment: AsaasPaymentData;
  fallbackBillingType: typeof SUBSCRIPTION_BILLING_TYPE;
  fallbackValue: number;
}) {
  const { userId, asaasCustomerId, asaasSubscriptionId, payment, fallbackBillingType, fallbackValue } =
    params;

  if (!payment?.id) return;

  const status = String(payment.status || 'PENDING');
  const billingType = String(payment.billingType || fallbackBillingType);
  const amountCents = Math.round(Number(payment.value || fallbackValue) * 100);
  const dueDate = parseAsaasDate(payment.dueDate);
  const paidAt =
    parseAsaasDate(payment.paymentDate) ||
    parseAsaasDate(payment.confirmedDate) ||
    parseAsaasDate(payment.creditDate);

  await prisma.asaasPayment.upsert({
    where: { asaasPaymentId: payment.id },
    create: {
      userId,
      asaasPaymentId: payment.id,
      asaasCustomerId,
      asaasSubscriptionId,
      status,
      billingType,
      amountCents,
      dueDate,
      paidAt,
      invoiceUrl: payment.invoiceUrl || null,
      description: payment.description || 'FIEL.IA - Plano Premium Mensal',
      externalReference: payment.externalReference || `user:${userId}`,
      raw: payment,
    },
    update: {
      status,
      billingType,
      amountCents,
      dueDate,
      paidAt,
      invoiceUrl: payment.invoiceUrl || null,
      description: payment.description || undefined,
      externalReference: payment.externalReference || undefined,
      asaasCustomerId,
      asaasSubscriptionId,
      raw: payment,
    },
  });
}

async function getOpenPaymentForSubscription(subscriptionId: string) {
  const subscription = await asaasClient.getSubscription(subscriptionId);
  const status = String(subscription?.status || '').toUpperCase();

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    return { subscription, payment: null };
  }

  const paymentsResponse = await asaasClient.listSubscriptionPayments(subscriptionId);
  const payments: AsaasPaymentData[] = Array.isArray(paymentsResponse?.data)
    ? (paymentsResponse.data as AsaasPaymentData[])
    : [];

  const pendingPayments = payments
    .filter((payment) => OPEN_STATUSES.has(String(payment?.status || '').toUpperCase()))
    .sort((a, b) => {
      const dueA = parseAsaasDate(a?.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      const dueB = parseAsaasDate(b?.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });

  return {
    subscription,
    payment: pendingPayments[0] || null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedBillingType = String(
      body?.billingType || SUBSCRIPTION_BILLING_TYPE
    ).toUpperCase();
    if (requestedBillingType !== SUBSCRIPTION_BILLING_TYPE) {
      return NextResponse.json(
        { error: 'Only CREDIT_CARD subscriptions are supported' },
        { status: 400 }
      );
    }
    const billingType = SUBSCRIPTION_BILLING_TYPE;

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json(
        { error: 'Asaas is not configured (ASAAS_API_KEY missing)' },
        { status: 500 }
      );
    }

    const userId = session.user.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    if (user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now)) {
      return NextResponse.json(
        { error: 'User already has an active premium subscription' },
        { status: 409 }
      );
    }

    // Create or get Asaas customer
    let asaasCustomerId = user.asaasCustomerId;
    const cpfCnpj =
      user.cpfCnpj ||
      (body?.cpfCnpj ? String(body.cpfCnpj).replace(/\D/g, '') : null) ||
      (process.env.NODE_ENV !== 'production' ? generateValidCpf(user.id) : null);

    if (!cpfCnpj || cpfCnpj.length < 11) {
      return NextResponse.json(
        { error: 'CPF é obrigatório para criar a assinatura. Informe seu CPF na página de conta.' },
        { status: 400 }
      );
    }

    if (!asaasCustomerId) {
      const asaasCustomer = await asaasClient.createCustomer({
        name: user.name,
        cpfCnpj,
        email: user.email,
        phone: user.phone || undefined,
      });

      asaasCustomerId = asaasCustomer.id;

      // Update user with Asaas customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId, ...(user.cpfCnpj ? {} : { cpfCnpj }) },
      });
    }

    if (!asaasCustomerId) {
      throw new Error('Failed to resolve Asaas Customer ID');
    }

    const planValue = resolvePlanValue();
    let replacedLegacySubscription = false;

    // Prevent duplicate subscriptions: try to reuse pending payment from current subscription
    if (user.asaasSubscriptionId) {
      try {
        const existing = await getOpenPaymentForSubscription(user.asaasSubscriptionId);
        const existingPayment = existing.payment;

        if (existingPayment?.id) {
          await upsertPaymentRecord({
            userId,
            asaasCustomerId,
            asaasSubscriptionId: user.asaasSubscriptionId,
            payment: existingPayment,
            fallbackBillingType: SUBSCRIPTION_BILLING_TYPE,
            fallbackValue: planValue,
          });

          const existingBillingType = String(
            existingPayment.billingType || ''
          ).toUpperCase();
          if (existingBillingType !== SUBSCRIPTION_BILLING_TYPE) {
            try {
              await asaasClient.cancelSubscription(user.asaasSubscriptionId);
              await prisma.user.update({
                where: { id: userId },
                data: { asaasSubscriptionId: null },
              });
              replacedLegacySubscription = true;
            } catch (cancelError) {
              console.warn('Failed to replace non-credit subscription:', cancelError);
              return NextResponse.json(
                {
                  error:
                    'Existing subscription uses an unsupported billing type. Cancel it before creating a credit card subscription.',
                },
                { status: 409 }
              );
            }
          } else {
            return NextResponse.json({
              reusedSubscription: true,
              billingType: SUBSCRIPTION_BILLING_TYPE,
              subscriptionId: user.asaasSubscriptionId,
              paymentId: existingPayment.id,
              status: existingPayment.status || existing.subscription?.status || 'PENDING',
              dueDate: existingPayment.dueDate || existing.subscription?.nextDueDate || null,
              invoiceUrl: existingPayment.invoiceUrl || null,
            });
          }
        }

        const existingStatus = String(existing.subscription?.status || '').toUpperCase();
        if (!replacedLegacySubscription && ACTIVE_SUBSCRIPTION_STATUSES.has(existingStatus)) {
          return NextResponse.json(
            {
              error: 'There is already an active subscription for this user',
              subscriptionId: user.asaasSubscriptionId,
            },
            { status: 409 }
          );
        }
      } catch (error) {
        console.warn('Failed to inspect existing Asaas subscription:', error);
      }
    }

    // Create recurring subscription for premium access
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subscription = await asaasClient.createSubscription({
      customer: asaasCustomerId,
      billingType,
      value: planValue,
      nextDueDate: formatAsaasDate(nextDueDate),
      cycle: 'MONTHLY',
      description: 'FIEL.IA - Plano Premium Mensal',
      externalReference: `user:${userId}`,
    });

    // Get the first payment from the subscription
    let firstPayment: AsaasPaymentData | null = null;
    try {
      const paymentsResponse = await asaasClient.listSubscriptionPayments(subscription.id);
      if (paymentsResponse?.data?.length > 0) {
        firstPayment = paymentsResponse.data[0];
      }
    } catch (error) {
      console.warn('Failed to fetch subscription payments:', error);
    }

    // Update user with subscription info
    await prisma.user.update({
      where: { id: userId },
      data: {
        asaasSubscriptionId: subscription.id,
        isPremium: false, // Will be activated on payment confirmation via webhook
        subscriptionEnd: null,
      },
    });

    // Save payment record if we have a first payment
    if (firstPayment) {
      await upsertPaymentRecord({
        userId,
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
        payment: firstPayment,
        fallbackBillingType: SUBSCRIPTION_BILLING_TYPE,
        fallbackValue: planValue,
      });
    }

    return NextResponse.json({
      reusedSubscription: false,
      billingType: SUBSCRIPTION_BILLING_TYPE,
      subscriptionId: subscription.id,
      paymentId: firstPayment?.id || null,
      status: firstPayment?.status || subscription.status,
      dueDate: firstPayment?.dueDate || subscription.nextDueDate,
      invoiceUrl: firstPayment?.invoiceUrl || null,
    });
  } catch (error) {
    console.error('Create Premium Subscription Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-expire premium when subscriptionEnd is in the past
    const now = new Date();
    if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false, subscriptionEnd: null },
      });
      user.isPremium = false;
      user.subscriptionEnd = null;
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      subscriptionEnd: user.subscriptionEnd,
      asaasCustomerId: user.asaasCustomerId,
      asaasSubscriptionId: user.asaasSubscriptionId,
    });
  } catch (error) {
    console.error('Get Subscription Status Error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cancel Asaas subscription if exists
    if (user.asaasSubscriptionId) {
      try {
        await asaasClient.cancelSubscription(user.asaasSubscriptionId);
      } catch (error) {
        console.warn('Failed to cancel Asaas subscription:', error);
      }
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        subscriptionEnd: null,
        asaasSubscriptionId: null,
      },
    });

    return NextResponse.json({ message: 'Premium cancelled successfully' });
  } catch (error) {
    console.error('Cancel Premium Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel premium' },
      { status: 500 }
    );
  }
}
