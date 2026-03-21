import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';

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

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck && adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(filter === 'active'
          ? { isPremium: true }
          : filter === 'cancelled'
            ? { isPremium: false, asaasSubscriptionId: { not: null } }
            : filter === 'overdue'
              ? { isPremium: true, subscriptionEnd: { lt: new Date() } }
              : {}),
      },
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

    const payments = await prisma.asaasPayment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        asaasPaymentId: true,
        status: true,
        billingType: true,
        amountCents: true,
        dueDate: true,
        paidAt: true,
        invoiceUrl: true,
        createdAt: true,
      },
    });

    const confirmedPayments = payments.filter(
      (p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED' || p.status === 'RECEIVED_IN_CASH'
    );
    const totalRevenue = confirmedPayments.reduce((sum, p) => sum + p.amountCents, 0);
    const activeSubscribers = users.filter((u) => u.isPremium).length;
    const mrr = activeSubscribers * 5690;
    const overduePayments = payments.filter((p) => p.status === 'OVERDUE');

    return NextResponse.json({
      users,
      payments,
      stats: {
        totalUsers: users.length,
        activeSubscribers,
        totalRevenue,
        mrr,
        overdueCount: overduePayments.length,
        churnedCount: users.filter((u) => !u.isPremium && u.asaasSubscriptionId).length,
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
  const planValue = value || Number(process.env.ASAAS_SUBSCRIPTION_VALUE || '56.90');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd > new Date()) {
    return NextResponse.json({ error: 'Usuário já tem assinatura ativa' }, { status: 409 });
  }

  let asaasCustomerId = user.asaasCustomerId;
  if (!asaasCustomerId) {
    const cpf = user.cpfCnpj || generateSimpleCpf(user.id);
    const customer = await asaasClient.createCustomer({
      name: user.name, cpfCnpj: cpf, email: user.email, phone: user.phone || undefined,
    });
    asaasCustomerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { asaasCustomerId, ...(user.cpfCnpj ? {} : { cpfCnpj: cpf }) },
    });
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1);

  const subscription = await asaasClient.createSubscription({
    customer: asaasCustomerId!,
    billingType: 'UNDEFINED',
    value: planValue,
    nextDueDate: nextDueDate.toISOString().split('T')[0],
    cycle: 'MONTHLY',
    description: 'FIEL.IA - Plano Premium Mensal',
    externalReference: `user:${userId}`,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { asaasSubscriptionId: subscription.id },
  });

  return NextResponse.json({ ok: true, subscriptionId: subscription.id, customerId: asaasCustomerId });
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  if (user.asaasSubscriptionId) {
    try { await asaasClient.cancelSubscription(user.asaasSubscriptionId); }
    catch (err) { console.warn('Falha ao cancelar no Asaas:', err); }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isPremium: false, subscriptionEnd: null, asaasSubscriptionId: null },
  });

  return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true, subscriptionEnd: end });
}

async function handleRevokePremium(body: { userId: string }) {
  await prisma.user.update({
    where: { id: body.userId },
    data: { isPremium: false, subscriptionEnd: null },
  });
  return NextResponse.json({ ok: true });
}

function generateSimpleCpf(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const digits: number[] = [];
  for (let i = 0; i < 9; i++) {
    hash ^= hash << 13; hash ^= hash >>> 17; hash ^= hash << 5;
    digits.push(Math.abs(hash) % 10);
  }
  const calcCheck = (base: number[]) => {
    const w = base.length + 1;
    const sum = base.reduce((acc, d, i) => acc + d * (w - i), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  digits.push(calcCheck(digits));
  digits.push(calcCheck(digits));
  return digits.join('');
}
