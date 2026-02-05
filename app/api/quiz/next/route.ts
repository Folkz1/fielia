import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    // Buscar proximo quiz (que ainda nao comecou)
    const nextQuiz = await prisma.quiz.findFirst({
      where: {
        isActive: true,
        startDate: { gt: now },
      },
      orderBy: { startDate: 'asc' },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({ quiz: nextQuiz });
  } catch (error) {
    console.error('Fetch Next Quiz Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next quiz' },
      { status: 500 }
    );
  }
}
