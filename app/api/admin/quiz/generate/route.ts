import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateQuizWithAI, saveGeneratedQuiz } from '@/lib/quiz-generator';

// POST - Gerar quiz com IA
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
    const {
      numQuestions = 10,
      difficulty = 'medium',
      category = 'general',
      startDate,
      endDate,
      saveToDb = false,
    } = body;

    // Gerar quiz com IA
    const generatedQuiz = await generateQuizWithAI({
      numQuestions,
      difficulty,
      category,
    });

    // Se for para salvar no banco
    if (saveToDb && startDate && endDate) {
      const quiz = await saveGeneratedQuiz(
        generatedQuiz,
        new Date(startDate),
        new Date(endDate)
      );

      return NextResponse.json({
        success: true,
        quiz,
        generated: generatedQuiz,
      });
    }

    // Retornar apenas o quiz gerado (preview)
    return NextResponse.json({
      success: true,
      generated: generatedQuiz,
    });
  } catch (error) {
    console.error('Generate Quiz Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
