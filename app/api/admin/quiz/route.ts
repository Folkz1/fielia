import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type QuizAudience = 'free' | 'premium';
type QuizCadence = 'monthly' | 'weekly' | 'on_demand';
type RawQuestionPayload = {
  question?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  points?: unknown;
};

function normalizeAudience(value: unknown): QuizAudience {
  return value === 'premium' ? 'premium' : 'free';
}

function normalizeCadence(value: unknown, audience: QuizAudience): QuizCadence {
  if (value === 'weekly' || value === 'monthly' || value === 'on_demand') return value;
  return audience === 'premium' ? 'weekly' : 'monthly';
}

// GET - Listar todos os quizzes (admin)
export async function GET() {
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
    const audience = normalizeAudience(body?.audience);
    const cadence = normalizeCadence(body?.cadence, audience);

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, startDate and endDate are required' },
        { status: 400 }
      );
    }

    await prisma.quiz.updateMany({
      where: { isActive: true, audience, cadence },
      data: { isActive: false },
    });

    const normalizedQuestions = Array.isArray(questions)
      ? (questions as RawQuestionPayload[]).map((q, index) => ({
          question: String(q.question || '').trim(),
          options: Array.isArray(q.options)
            ? q.options.map((option) => String(option).trim()).filter(Boolean)
            : [],
          correctAnswer: String(q.correctAnswer || '').trim(),
          points: Number(q.points || 100),
          order: index,
        }))
      : [];

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        difficulty: difficulty || 'medium',
        category: category || 'general',
        audience,
        cadence,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        questions: normalizedQuestions.length ? { create: normalizedQuestions } : undefined,
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
