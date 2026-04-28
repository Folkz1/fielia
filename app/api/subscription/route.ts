import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';
import {
  ACTIVE_ASAAS_SUBSCRIPTION_STATUSES,
  createLocalSubscriptionEvent,
  deriveBillingOverview,
  formatAsaasDate,
  getOpenPaymentForSubscription,
  isPremiumActive,
  resolvePlanValue,
  serializeBillingOverview,
  upsertAsaasPaymentRecord,
} from '@/lib/billing';
import { hashCpf, normalizeCpf } from '@/lib/identity';

export const runtime = 'nodejs';

const SUBSCRIPTION_BILLING_TYPE = 'CREDIT_CARD' as const;

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

function buildSubscriptionResponse(params: {
  user: {
    id: string;
    email: string;
    name: string;
    isPremium: boolean;
    subscriptionEnd: Date | null;
    asaasCustomerId: string | null;
    asaasSubscriptionId: string | null;
  };
  payments: Array<{
    asaasPaymentId: string;
    status: string;
    dueDate: Date | null;
    paidAt: Date | null;
    invoiceUrl: string | null;
    asaasSubscriptionId: string | null;
    createdAt: Date;
  }>;
}) {
  const overview = deriveBillingOverview({
    user: params.user,
    payments: params.payments,
  });

  return {
    userId: params.user.id,
    email: params.user.email,
    name: params.user.name,
    isPremium: overview.isPremiumActive,
    asaasCustomerId: params.user.asaasCustomerId,
    asaasSubscriptionId: params.user.asaasSubscriptionId,
    hasSubscription: Boolean(overview.lastSubscriptionId),
    ...serializeBillingOverview(overview),
  };
}

function mapRouteError(error: unknown) {
  const anyError = error as { message?: string; code?: string; asaasErrors?: Array<{ description?: string }> };
  const asaasDetails = (anyError?.asaasErrors || [])
    .map((item) => item.description || '')
    .join(' ')
    .toLowerCase();
  const message = String(anyError?.message || '').toLowerCase();
  const detail = `${message} ${asaasDetails}`;

  if (anyError?.code === 'P2002' || detail.includes('unique constraint')) {
    if (detail.includes('cpf')) {
      return NextResponse.json(
        { error: 'Este CPF já está em uso por outro usuário.' },
        { status: 409 }
      );
    }

    if (detail.includes('phone') || detail.includes('telefone')) {
      return NextResponse.json(
        { error: 'Este telefone já está em uso por outro usuário.' },
        { status: 409 }
      );
    }
  }

  if (detail.includes('cpf')) {
    return NextResponse.json(
      { error: 'Não foi possível validar o CPF informado para criar a assinatura.' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Failed to create subscription' },
    { status: 500 }
  );
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

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json(
        { error: 'Asaas is not configured (ASAAS_API_KEY missing)' },
        { status: 500 }
      );
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        cpfCnpj: true,
        cpfHash: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    if (isPremiumActive(user, now)) {
      return NextResponse.json(
        { error: 'User already has an active premium subscription' },
        { status: 409 }
      );
    }

    let asaasCustomerId = user.asaasCustomerId;
    const cpfCnpj =
      normalizeCpf(body?.cpfCnpj) ||
      normalizeCpf(user.cpfCnpj) ||
      (process.env.NODE_ENV !== 'production' ? generateValidCpf(user.id) : null);

    if (!cpfCnpj || cpfCnpj.length < 11) {
      return NextResponse.json(
        { error: 'CPF é obrigatório para criar a assinatura. Informe seu CPF na página de conta.' },
        { status: 400 }
      );
    }

    const cpfHash = hashCpf(cpfCnpj);
    if (user.cpfHash !== cpfHash) {
      const cpfConflict = await prisma.user.findFirst({
        where: {
          OR: [{ cpfHash }, { cpfCnpj }],
          id: { not: userId },
        },
        select: { id: true },
      });

      if (cpfConflict) {
        return NextResponse.json(
          { error: 'Este CPF já está em uso por outro usuário.' },
          { status: 409 }
        );
      }
    }

    if (!asaasCustomerId) {
      const asaasCustomer = await asaasClient.createCustomer({
        name: user.name,
        cpfCnpj,
        email: user.email,
        phone: user.phone || undefined,
      });

      asaasCustomerId = asaasCustomer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId, ...(user.cpfHash ? {} : { cpfHash }) },
      });
    } else if (!user.cpfHash) {
      await prisma.user.update({
        where: { id: userId },
        data: { cpfHash },
      });
    }

    if (!asaasCustomerId) {
      throw new Error('Failed to resolve Asaas customer ID');
    }

    const planValue = resolvePlanValue();
    let replacedLegacySubscription = false;
    let activeSubscriptionId = user.asaasSubscriptionId;

    if (activeSubscriptionId) {
      try {
        const existing = await getOpenPaymentForSubscription(activeSubscriptionId);
        const existingPayment = existing.payment;

        if (existingPayment?.id) {
          await upsertAsaasPaymentRecord({
            userId,
            asaasCustomerId,
            asaasSubscriptionId: activeSubscriptionId,
            payment: existingPayment,
            fallbackBillingType: SUBSCRIPTION_BILLING_TYPE,
            fallbackValue: planValue,
          });

          const existingBillingType = String(existingPayment.billingType || '').toUpperCase();
          if (existingBillingType !== SUBSCRIPTION_BILLING_TYPE) {
            try {
              await asaasClient.cancelSubscription(activeSubscriptionId);
              await prisma.user.update({
                where: { id: userId },
                data: { asaasSubscriptionId: null },
              });
              await createLocalSubscriptionEvent({
                event: 'SUBSCRIPTION_DELETED',
                subscriptionId: activeSubscriptionId,
                userId,
                payload: { reason: 'legacy_billing_type_replaced' },
              });
              activeSubscriptionId = null;
              replacedLegacySubscription = true;
            } catch (cancelError) {
              console.warn('Failed to replace non-credit subscription:', cancelError);
              return NextResponse.json(
                {
                  error:
                    'Existe uma assinatura ativa com forma de cobrança incompatível. Cancele a assinatura atual antes de criar uma nova no cartão.',
                },
                { status: 409 }
              );
            }
          } else {
            return NextResponse.json({
              reusedSubscription: true,
              billingType: SUBSCRIPTION_BILLING_TYPE,
              subscriptionId: activeSubscriptionId,
              paymentId: existingPayment.id,
              status: existingPayment.status || existing.subscription?.status || 'PENDING',
              dueDate: existingPayment.dueDate || existing.subscription?.nextDueDate || null,
              invoiceUrl: existingPayment.invoiceUrl || null,
              subscriptionState: 'pending_payment',
              paymentStatus: existingPayment.status || 'PENDING',
              cancelAtPeriodEnd: false,
            });
          }
        }

        const existingStatus = String(existing.subscription?.status || '').toUpperCase();
        if (!replacedLegacySubscription && ACTIVE_ASAAS_SUBSCRIPTION_STATUSES.has(existingStatus)) {
          const localPending = await prisma.asaasPayment.findFirst({
            where: {
              userId,
              asaasSubscriptionId: activeSubscriptionId,
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

          if (localPending) {
            return NextResponse.json({
              reusedSubscription: true,
              billingType: SUBSCRIPTION_BILLING_TYPE,
              subscriptionId: activeSubscriptionId,
              paymentId: localPending.asaasPaymentId,
              status: localPending.status,
              dueDate: localPending.dueDate?.toISOString() || null,
              invoiceUrl: localPending.invoiceUrl || null,
              subscriptionState:
                localPending.status === 'OVERDUE' ? 'overdue' : 'pending_payment',
              paymentStatus: localPending.status,
              cancelAtPeriodEnd: false,
            });
          }

          return NextResponse.json(
            {
              error: 'There is already an active subscription for this user',
              subscriptionId: activeSubscriptionId,
            },
            { status: 409 }
          );
        }
      } catch (error) {
        console.warn('Failed to inspect existing Asaas subscription:', error);
      }
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subscription = await asaasClient.createSubscription({
      customer: asaasCustomerId,
      billingType: SUBSCRIPTION_BILLING_TYPE,
      value: planValue,
      nextDueDate: formatAsaasDate(nextDueDate),
      cycle: 'MONTHLY',
      description: 'FIEL.IA - Plano Premium Mensal',
      externalReference: `user:${userId}`,
    });

    let firstPayment = null;
    try {
      const { payment } = await getOpenPaymentForSubscription(subscription.id);
      firstPayment = payment;
    } catch (error) {
      console.warn('Failed to fetch subscription payments:', error);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        asaasSubscriptionId: subscription.id,
        isPremium: false,
        subscriptionEnd: null,
      },
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

    const payments = [];
    if (firstPayment) {
      await upsertAsaasPaymentRecord({
        userId,
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
        payment: firstPayment,
        fallbackBillingType: SUBSCRIPTION_BILLING_TYPE,
        fallbackValue: planValue,
      });

      payments.push({
        asaasPaymentId: String(firstPayment.id),
        status: String(firstPayment.status || 'PENDING'),
        dueDate: firstPayment.dueDate ? new Date(firstPayment.dueDate) : null,
        paidAt: null,
        invoiceUrl: firstPayment.invoiceUrl || null,
        asaasSubscriptionId: subscription.id,
        createdAt: new Date(),
      });
    }

    const billingOverview = serializeBillingOverview(
      deriveBillingOverview({
        user: updatedUser,
        payments,
      })
    );

    return NextResponse.json({
      ...billingOverview,
      reusedSubscription: false,
      billingType: SUBSCRIPTION_BILLING_TYPE,
      subscriptionId: subscription.id,
      paymentId: firstPayment?.id || null,
      status: firstPayment?.status || subscription.status,
      dueDate: billingOverview.dueDate || firstPayment?.dueDate || subscription.nextDueDate,
      invoiceUrl: billingOverview.invoiceUrl || firstPayment?.invoiceUrl || null,
    });
  } catch (error) {
    console.error('Create Premium Subscription Error:', error);
    return mapRouteError(error);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
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

    const now = new Date();
    if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false, subscriptionEnd: null },
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
    }

    const payments = await prisma.asaasPayment.findMany({
      where: { userId: user.id },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        asaasPaymentId: true,
        status: true,
        dueDate: true,
        paidAt: true,
        invoiceUrl: true,
        asaasSubscriptionId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(buildSubscriptionResponse({ user, payments }));
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

    const keepAccessUntil = isPremiumActive(user) ? user.subscriptionEnd : null;
    const subscriptionId = user.asaasSubscriptionId;

    if (subscriptionId) {
      try {
        await asaasClient.cancelSubscription(subscriptionId);
      } catch (error) {
        console.warn('Failed to cancel Asaas subscription:', error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: Boolean(keepAccessUntil),
        subscriptionEnd: keepAccessUntil,
        asaasSubscriptionId: null,
      },
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

    if (subscriptionId) {
      await createLocalSubscriptionEvent({
        event: 'SUBSCRIPTION_DELETED',
        subscriptionId,
        userId,
        payload: {
          cancelledVia: 'app_api_subscription_delete',
          accessPreservedUntil: keepAccessUntil?.toISOString() || null,
        },
      });
    }

    const payments = await prisma.asaasPayment.findMany({
      where: { userId },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        asaasPaymentId: true,
        status: true,
        dueDate: true,
        paidAt: true,
        invoiceUrl: true,
        asaasSubscriptionId: true,
        createdAt: true,
      },
    });

    const overview = buildSubscriptionResponse({ user: updatedUser, payments });

    return NextResponse.json({
      message: keepAccessUntil
        ? 'Recorrência cancelada. Seu acesso premium permanece até o fim do período já pago.'
        : 'Subscription cancelled successfully',
      ...overview,
    });
  } catch (error) {
    console.error('Cancel Premium Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel premium' },
      { status: 500 }
    );
  }
}
