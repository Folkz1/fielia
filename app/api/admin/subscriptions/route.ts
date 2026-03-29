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

type AdminFilter = 'all' | 'active' | 'cancelled' | 'overdue' | 'pending';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

function generateSimpleCpf(seed: string) {
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
    const weight = base.length + 1;
    const sum = base.reduce((acc, digit, idx) => acc + digit * (weight - idx), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  digits.push(calcCheck(digits));
  digits.push(calcCheck(digits));
  return digits.join('');
}

function getSubscriptionIdFromEventPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, any>;
  return (
    record?.subscription?.id ||
    record?.payment?.subscription ||
    null
  );
}

function matchesFilter(filter: AdminFilter, subscriptionState: string) {
  if (filter === 'all') return true;
  if (filter === 'active') return subscriptionState === 'active';
  if (filter === 'cancelled') return subscriptionState === 'cancelled_pending_end';
  if (filter === 'overdue') return subscriptionState === 'overdue';
  if (filter === 'pending') return subscriptionState === 'pending_payment';
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck && adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'all') as AdminFilter;
    const search = searchParams.get('search') || '';

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
      },
    });

    const userIds = users.map((user) => user.id);
    const payments = userIds.length
      ? await prisma.asaasPayment.findMany({
          where: { userId: { in: userIds } },
          orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            userId: true,
            asaasPaymentId: true,
            asaasSubscriptionId: true,
            status: true,
            billingType: true,
            amountCents: true,
            dueDate: true,
            paidAt: true,
            invoiceUrl: true,
            createdAt: true,
          },
        })
      : [];

    const recentEvents = await prisma.asaasWebhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        event: true,
        asaasPaymentId: true,
        payload: true,
        createdAt: true,
      },
    });

    const paymentsByUser = new Map<string, typeof payments>();
    const paymentByAsaasId = new Map<string, (typeof payments)[number]>();
    const subscriptionIdsByUser = new Map<string, Set<string>>();

    for (const payment of payments) {
      if (!paymentsByUser.has(payment.userId)) {
        paymentsByUser.set(payment.userId, []);
      }
      paymentsByUser.get(payment.userId)!.push(payment);
      paymentByAsaasId.set(payment.asaasPaymentId, payment);

      if (payment.asaasSubscriptionId) {
        if (!subscriptionIdsByUser.has(payment.userId)) {
          subscriptionIdsByUser.set(payment.userId, new Set<string>());
        }
        subscriptionIdsByUser.get(payment.userId)!.add(payment.asaasSubscriptionId);
      }
    }

    for (const user of users) {
      if (user.asaasSubscriptionId) {
        if (!subscriptionIdsByUser.has(user.id)) {
          subscriptionIdsByUser.set(user.id, new Set<string>());
        }
        subscriptionIdsByUser.get(user.id)!.add(user.asaasSubscriptionId);
      }
    }

    const lastEventByUser = new Map<
      string,
      { event: string; createdAt: Date; paymentId: string | null; eventId: string }
    >();

    for (const event of recentEvents) {
      let userId: string | null = null;

      if (event.asaasPaymentId) {
        const payment = paymentByAsaasId.get(event.asaasPaymentId);
        if (payment) {
          userId = payment.userId;
        }
      }

      if (!userId) {
        const subscriptionId = getSubscriptionIdFromEventPayload(event.payload);
        if (subscriptionId) {
          for (const [candidateUserId, subscriptionIds] of subscriptionIdsByUser.entries()) {
            if (subscriptionIds.has(subscriptionId)) {
              userId = candidateUserId;
              break;
            }
          }
        }
      }

      if (userId && !lastEventByUser.has(userId)) {
        lastEventByUser.set(userId, {
          event: event.event,
          createdAt: event.createdAt,
          paymentId: event.asaasPaymentId || null,
          eventId: event.id,
        });
      }
    }

    const enrichedUsers = users
      .map((user) => {
        const userPayments = paymentsByUser.get(user.id) || [];
        const overview = deriveBillingOverview({
          user,
          payments: userPayments.map((payment) => ({
            asaasPaymentId: payment.asaasPaymentId,
            status: payment.status,
            dueDate: payment.dueDate,
            paidAt: payment.paidAt,
            invoiceUrl: payment.invoiceUrl,
            asaasSubscriptionId: payment.asaasSubscriptionId,
            createdAt: payment.createdAt,
          })),
        });

        const lastEvent = lastEventByUser.get(user.id);
        return {
          ...user,
          ...serializeBillingOverview(overview),
          isPremium: overview.isPremiumActive,
          lastWebhookEvent: lastEvent?.event || null,
          lastWebhookEventAt: lastEvent?.createdAt.toISOString() || null,
          lastWebhookEventId: lastEvent?.eventId || null,
          lastWebhookPaymentId: lastEvent?.paymentId || null,
        };
      })
      .filter((user) => matchesFilter(filter, user.subscriptionState));

    const confirmedPayments = payments.filter((payment) =>
      ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status)
    );
    const recurringUsers = enrichedUsers.filter((user) =>
      ['active', 'pending_payment', 'overdue'].includes(user.subscriptionState)
    );
    const totalRevenue = confirmedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const activeSubscribers = enrichedUsers.filter((user) =>
      ['active', 'cancelled_pending_end'].includes(user.subscriptionState)
    ).length;
    const overdueCount = enrichedUsers.filter((user) => user.subscriptionState === 'overdue').length;
    const pendingCount = enrichedUsers.filter((user) => user.subscriptionState === 'pending_payment').length;
    const cancelledCount = enrichedUsers.filter((user) => user.subscriptionState === 'cancelled_pending_end').length;

    return NextResponse.json({
      users: enrichedUsers,
      payments: payments.map((payment) => ({
        ...payment,
        dueDate: payment.dueDate?.toISOString() || null,
        paidAt: payment.paidAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
      })),
      stats: {
        totalUsers: enrichedUsers.length,
        activeSubscribers,
        totalRevenue,
        mrr: recurringUsers.length * Math.round(resolvePlanValue() * 100),
        overdueCount,
        pendingCount,
        churnedCount: cancelledCount,
      },
    });
  } catch (error) {
    console.error('List Subscriptions Error:', error);
    return NextResponse.json({ error: 'Failed to list subscriptions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck && adminCheck.error) return adminCheck.error;

    const body = await req.json();
    const { action } = body;

    if (action === 'create') return handleCreateSubscription(body);
    if (action === 'update-value') return handleUpdateValue(body);
    if (action === 'cancel') return handleCancelSubscription(body);
    if (action === 'grant-premium') return handleGrantPremium(body);
    if (action === 'revoke-premium') return handleRevokePremium(body);

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Subscription Action Error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

async function handleCreateSubscription(body: { userId: string; value?: number }) {
  const { userId, value } = body;
  const planValue = value || resolvePlanValue();

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  if (isPremiumActive(user)) {
    return NextResponse.json({ error: 'Usuário já tem assinatura ativa' }, { status: 409 });
  }

  let asaasCustomerId = user.asaasCustomerId;
  if (!asaasCustomerId) {
    const cpf = user.cpfCnpj || generateSimpleCpf(user.id);
    const customer = await asaasClient.createCustomer({
      name: user.name,
      cpfCnpj: cpf,
      email: user.email,
      phone: user.phone || undefined,
    });
    asaasCustomerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { asaasCustomerId, ...(user.cpfCnpj ? {} : { cpfCnpj: cpf }) },
    });
  }

  if (user.asaasSubscriptionId) {
    try {
      const existing = await getOpenPaymentForSubscription(user.asaasSubscriptionId);
      const existingStatus = String(existing.subscription?.status || '').toUpperCase();
      if (existing.payment?.invoiceUrl) {
        await upsertAsaasPaymentRecord({
          userId,
          asaasCustomerId: asaasCustomerId!,
          asaasSubscriptionId: user.asaasSubscriptionId,
          payment: existing.payment,
          fallbackBillingType: 'UNDEFINED',
          fallbackValue: planValue,
        });

        return NextResponse.json({
          ok: true,
          reusedSubscription: true,
          subscriptionId: user.asaasSubscriptionId,
          paymentId: existing.payment.id || null,
          invoiceUrl: existing.payment.invoiceUrl || null,
          status: existing.payment.status || existingStatus || 'PENDING',
        });
      }

      if (ACTIVE_ASAAS_SUBSCRIPTION_STATUSES.has(existingStatus)) {
        return NextResponse.json(
          { error: 'Usuário já possui uma assinatura em aberto' },
          { status: 409 }
        );
      }
    } catch (error) {
      console.warn('Admin create subscription: failed to inspect existing subscription', error);
    }
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1);

  const subscription = await asaasClient.createSubscription({
    customer: asaasCustomerId!,
    billingType: 'UNDEFINED',
    value: planValue,
    nextDueDate: formatAsaasDate(nextDueDate),
    cycle: 'MONTHLY',
    description: 'FIEL.IA - Plano Premium Mensal',
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
  } catch (error) {
    console.warn('Admin create subscription: failed to load first payment', error);
  }

  if (firstPayment?.id) {
    await upsertAsaasPaymentRecord({
      userId,
      asaasCustomerId: asaasCustomerId!,
      asaasSubscriptionId: subscription.id,
      payment: firstPayment,
      fallbackBillingType: 'UNDEFINED',
      fallbackValue: planValue,
    });
  }

  return NextResponse.json({
    ok: true,
    subscriptionId: subscription.id,
    customerId: asaasCustomerId,
    paymentId: firstPayment?.id || null,
    invoiceUrl: firstPayment?.invoiceUrl || null,
    status: firstPayment?.status || subscription.status,
  });
}

async function handleUpdateValue(body: { subscriptionId: string; value: number }) {
  const { subscriptionId, value } = body;
  if (!subscriptionId || !value || value <= 0) {
    return NextResponse.json({ error: 'subscriptionId e value obrigatórios' }, { status: 400 });
  }

  const result = await asaasClient.updateSubscription(subscriptionId, { value });
  return NextResponse.json({ ok: true, subscriptionId, newValue: result.value });
}

async function handleCancelSubscription(body: { userId: string }) {
  const { userId } = body;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isPremium: true,
      subscriptionEnd: true,
      asaasSubscriptionId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const keepAccessUntil = isPremiumActive(user) ? user.subscriptionEnd : null;
  const subscriptionId = user.asaasSubscriptionId;

  if (subscriptionId) {
    try {
      await asaasClient.cancelSubscription(subscriptionId);
    } catch (err) {
      console.warn('Falha ao cancelar no Asaas:', err);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: Boolean(keepAccessUntil),
      subscriptionEnd: keepAccessUntil,
      asaasSubscriptionId: null,
    },
  });

  if (subscriptionId) {
    await createLocalSubscriptionEvent({
      event: 'SUBSCRIPTION_DELETED',
      subscriptionId,
      userId,
      payload: {
        cancelledVia: 'admin_subscriptions_action',
        accessPreservedUntil: keepAccessUntil?.toISOString() || null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: Boolean(keepAccessUntil),
    subscriptionEnd: keepAccessUntil?.toISOString() || null,
  });
}

async function handleGrantPremium(body: { userId: string; months?: number }) {
  const { userId, months = 1 } = body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const now = new Date();
  const base = user.subscriptionEnd && user.subscriptionEnd > now ? user.subscriptionEnd : now;
  const end = new Date(base);
  end.setMonth(end.getMonth() + months);

  await prisma.user.update({
    where: { id: userId },
    data: { isPremium: true, subscriptionEnd: end },
  });

  return NextResponse.json({ ok: true, subscriptionEnd: end.toISOString() });
}

async function handleRevokePremium(body: { userId: string }) {
  await prisma.user.update({
    where: { id: body.userId },
    data: { isPremium: false, subscriptionEnd: null },
  });
  return NextResponse.json({ ok: true });
}
