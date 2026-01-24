import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const { userId, plan = 'premium' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or get Asaas customer
    let asaasCustomerId = user.asaasCustomerId;

    if (!asaasCustomerId) {
      const asaasCustomer = await asaasClient.createCustomer({
        name: user.name,
        cpfCnpj: user.cpfCnpj || '00000000000', // TODO: Get from user registration
        email: user.email,
        phone: user.phone || undefined,
      });

      asaasCustomerId = asaasCustomer.id;

      // Update user with Asaas customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId },
      });
    }

    // Create subscription
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 7); // 7 days trial



    if (!asaasCustomerId) {
      throw new Error('Failed to resolve Asaas Customer ID');
    }

    const subscription = await asaasClient.createSubscription({
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: 9.90,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'FIEL.IA - Plano Premium',
    });

    // Update user subscription
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        subscriptionEnd,
        asaasSubscriptionId: subscription.id,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      nextDueDate: subscription.nextDueDate,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Create Subscription Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.asaasSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel subscription in Asaas
    await asaasClient.cancelSubscription(user.asaasSubscriptionId);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        asaasSubscriptionId: null,
      },
    });

    return NextResponse.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
