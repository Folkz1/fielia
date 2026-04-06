import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash('fiel123', 10);
    const results: Record<string, string> = {};

    // 1. Criar/atualizar teste@fiel.ia (Premium)
    const premiumUser = await prisma.user.upsert({
      where: { email: 'teste@fiel.ia' },
      update: {
        password: hashedPassword,
        isPremium: true,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        email: 'teste@fiel.ia',
        name: 'Fiel Torcedor',
        password: hashedPassword,
        phone: '+5511999999999',
        isPremium: true,
        totalPoints: 150,
        currentStreak: 7,
        maxStreak: 10,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    results['teste@fiel.ia'] = `Premium OK (id: ${premiumUser.id})`;

    // 2. Criar/atualizar free@fielchat.com (Gratuito)
    const freeUser = await prisma.user.upsert({
      where: { email: 'free@fielchat.com' },
      update: {
        password: hashedPassword,
      },
      create: {
        email: 'free@fielchat.com',
        name: 'Torcedor Free',
        password: hashedPassword,
        phone: '+5511888888888',
        isPremium: false,
        totalPoints: 0,
        currentStreak: 0,
        maxStreak: 0,
      },
    });
    results['free@fielchat.com'] = `Free OK (id: ${freeUser.id})`;

    // 3. Verificar admin
    const admin = await prisma.user.findUnique({
      where: { email: 'diegocleanmaster@gmail.com' },
      select: { id: true, email: true, name: true, password: true },
    });
    if (admin) {
      if (!admin.password) {
        await prisma.user.update({
          where: { email: 'diegocleanmaster@gmail.com' },
          data: { password: hashedPassword },
        });
        results['diegocleanmaster@gmail.com'] = `Admin atualizado com senha fiel123 (id: ${admin.id})`;
      } else {
        results['diegocleanmaster@gmail.com'] = `Admin ja existe (id: ${admin.id})`;
      }
    } else {
      const newAdmin = await prisma.user.create({
        data: {
          email: 'diegocleanmaster@gmail.com',
          name: 'Diego Admin',
          password: hashedPassword,
          isPremium: true,
          totalPoints: 0,
          currentStreak: 0,
          maxStreak: 0,
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      results['diegocleanmaster@gmail.com'] = `Admin criado com senha fiel123 (id: ${newAdmin.id})`;
    }

    return NextResponse.json({
      success: true,
      message: 'Usuarios de teste criados/atualizados!',
      credentials: { password: 'fiel123' },
      results,
    });
  } catch (error) {
    console.error('Error creating test users:', error);
    return NextResponse.json(
      { error: 'Failed to create test users', details: String(error) },
      { status: 500 }
    );
  }
}
