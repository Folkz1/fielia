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

    // 3. Admin - sempre força isAdmin: true
    const adminUser = await prisma.user.upsert({
      where: { email: 'diegocleanmaster@gmail.com' },
      update: {
        password: hashedPassword,
        isAdmin: true,
        isPremium: true,
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        email: 'diegocleanmaster@gmail.com',
        name: 'Diego Admin',
        password: hashedPassword,
        isAdmin: true,
        isPremium: true,
        totalPoints: 0,
        currentStreak: 0,
        maxStreak: 0,
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    results['diegocleanmaster@gmail.com'] = `Admin OK isAdmin=true (id: ${adminUser.id})`;

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
