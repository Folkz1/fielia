import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
        name: true,
        email: true,
        phone: true,
        cpfCnpj: true,
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

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      cpfCnpj: user.cpfCnpj,
      isPremium: user.isPremium,
      subscriptionEnd: user.subscriptionEnd,
      hasSubscription: !!user.asaasSubscriptionId,
      createdAt: user.createdAt,
      totalPoints: user.totalPoints,
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

    const body = await req.json();
    const updates: Record<string, string> = {};

    if (body.name && typeof body.name === 'string') {
      updates.name = body.name.trim().slice(0, 100);
    }
    if (body.phone && typeof body.phone === 'string') {
      updates.phone = body.phone.replace(/\D/g, '').slice(0, 15);
    }
    if (body.cpfCnpj && typeof body.cpfCnpj === 'string') {
      const cleaned = body.cpfCnpj.replace(/\D/g, '');
      if (cleaned.length === 11 || cleaned.length === 14) {
        updates.cpfCnpj = cleaned;
      } else {
        return NextResponse.json({ error: 'CPF/CNPJ inválido' }, { status: 400 });
      }
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
        cpfCnpj: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
