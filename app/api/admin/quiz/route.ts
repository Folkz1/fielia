import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET - Listar todos os quizzes (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('List Quizzes Error:', error);
    return NextResponse.json(
      { error: 'Failed to list quizzes' },
      { status: 500 }
    );
  }
}

// POST - Criar novo quiz (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, difficulty, category, startDate, endDate, questions } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Criar quiz com perguntas
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        difficulty: difficulty || 'medium',
        category: category || 'general',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        questions: questions ? {
          create: questions.map((q: any, index: number) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 100,
            order: index,
          })),
        } : undefined,
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error('Create Quiz Error:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}
