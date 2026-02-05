import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';

export const runtime = 'nodejs';

function formatAsaasDate(date: Date) {
  return date.toISOString().split('T')[0];
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const billingType = (body?.billingType || 'PIX') as 'PIX' | 'BOLETO';
    if (!['PIX', 'BOLETO'].includes(billingType)) {
      return NextResponse.json({ error: 'billingType must be PIX or BOLETO' }, { status: 400 });
    }

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

    // Create or get Asaas customer
    let asaasCustomerId = user.asaasCustomerId;
    const cpfCnpj =
      user.cpfCnpj ||
      (process.env.NODE_ENV !== 'production' ? generateValidCpf(user.id) : null);

    if (!cpfCnpj) {
      return NextResponse.json(
        { error: 'cpfCnpj is required to create an Asaas customer' },
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

    // Create payment (detached) for premium access
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const payment = await asaasClient.createPayment({
      customer: asaasCustomerId,
      billingType,
      value: 56.9,
      dueDate: formatAsaasDate(dueDate),
      description: 'FIEL.IA - Plano Premium (30 dias)',
      externalReference: `user:${userId}`,
      callback: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?payment=success`,
        autoRedirect: true,
      },
    });

    await prisma.asaasPayment.create({
      data: {
        userId,
        asaasPaymentId: payment.id,
        asaasCustomerId,
        asaasSubscriptionId: payment.subscription || null,
        status: payment.status || 'UNKNOWN',
        billingType: payment.billingType || billingType,
        amountCents: Math.round(Number(payment.value || 0) * 100),
        dueDate: payment.dueDate ? new Date(payment.dueDate) : null,
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
        invoiceUrl: payment.invoiceUrl || null,
        description: payment.description || null,
        externalReference: payment.externalReference || null,
        raw: payment,
      },
    });

    let pixQrCode: any = null;
    if (billingType === 'PIX') {
      try {
        pixQrCode = await asaasClient.getPaymentPixQrCode(payment.id);
      } catch (error) {
        console.warn('Failed to fetch PIX QR Code:', error);
      }
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      dueDate: payment.dueDate,
      invoiceUrl: payment.invoiceUrl,
      pixQrCode,
    });
  } catch (error) {
    console.error('Create Premium Payment Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
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

export async function DELETE(req: NextRequest) {
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

    // If there is a legacy Asaas subscription, cancel it as well
    if (user.asaasSubscriptionId) {
      try {
        await asaasClient.cancelSubscription(user.asaasSubscriptionId);
      } catch (error) {
        console.warn('Failed to cancel Asaas subscription (legacy):', error);
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
