import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deriveBillingOverview, serializeBillingOverview } from '@/lib/billing';
import { hashCpf, isValidCpf, normalizeCpf } from '@/lib/identity';

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 15);
  return digits || null;
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
        name: true,
        email: true,
        phone: true,
        cpfCnpj: true,
        cpfHash: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
        createdAt: true,
        totalPoints: true,
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
          name: true,
          email: true,
          phone: true,
          cpfCnpj: true,
          cpfHash: true,
          isPremium: true,
          subscriptionEnd: true,
          asaasCustomerId: true,
          asaasSubscriptionId: true,
          createdAt: true,
          totalPoints: true,
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

    const overview = deriveBillingOverview({
      user,
      payments,
    });

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasCpf: Boolean(user.cpfHash || user.cpfCnpj),
      isPremium: overview.isPremiumActive,
      hasSubscription: Boolean(overview.lastSubscriptionId),
      createdAt: user.createdAt.toISOString(),
      totalPoints: user.totalPoints,
      asaasCustomerId: user.asaasCustomerId,
      asaasSubscriptionId: user.asaasSubscriptionId,
      ...serializeBillingOverview(overview),
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, string> = {};

    if (body.name && typeof body.name === 'string') {
      updates.name = body.name.trim().slice(0, 100);
    }

    if (body.email && typeof body.email === 'string') {
      const email = normalizeEmail(body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing && existing.id !== session.user.id) {
        return NextResponse.json({ error: 'Este email ja esta em uso' }, { status: 409 });
      }

      updates.email = email;
    }

    if (body.phone && typeof body.phone === 'string') {
      const phone = normalizePhone(body.phone);
      if (!phone || phone.length < 10) {
        return NextResponse.json({ error: 'Telefone invalido' }, { status: 400 });
      }

      const existing = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ error: 'Este telefone ja esta em uso' }, { status: 409 });
      }

      updates.phone = phone;
    }

    if (body.cpfCnpj && typeof body.cpfCnpj === 'string') {
      const cpf = normalizeCpf(body.cpfCnpj);
      if (!isValidCpf(cpf)) {
        return NextResponse.json({ error: 'CPF invalido' }, { status: 400 });
      }

      const cpfHash = hashCpf(cpf);
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ cpfHash }, { cpfCnpj: cpf }],
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ error: 'Este CPF ja esta em uso' }, { status: 409 });
      }

      updates.cpfHash = cpfHash;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpfHash: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasCpf: Boolean(user.cpfHash),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
