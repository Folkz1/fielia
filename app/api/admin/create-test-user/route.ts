import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'teste@fiel.ia' },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: 'Usuário de teste já existe!',
          credentials: {
            email: 'teste@fiel.ia',
            password: 'fiel123',
          },
        },
        { status: 200 }
      );
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('fiel123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'teste@fiel.ia',
        name: 'Fiel Torcedor',
        password: hashedPassword,
        phone: '+5511999999999',
        isPremium: true,
        totalPoints: 150,
        currentStreak: 7,
        maxStreak: 10,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário de teste criado com sucesso!',
      credentials: {
        email: 'teste@fiel.ia',
        password: 'fiel123',
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
      },
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { error: 'Failed to create test user', details: String(error) },
      { status: 500 }
    );
  }
}
