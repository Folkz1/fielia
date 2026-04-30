import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getPremiumAccess } from '@/lib/premium';
import { enqueuePostQuizCta } from '@/lib/funnel/queue';

const TIME_PER_QUESTION = 10;

type SubmittedAnswer = {
  questionId?: unknown;
  answer?: unknown;
  timeTaken?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId, answers } = await req.json();
    const userId = session.user.id;

    if (!quizId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'quizId and answers are required' },
        { status: 400 }
      );
    }

    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    const now = new Date();
    if (!quiz || !quiz.isActive || quiz.startDate > now || quiz.endDate < now) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const premiumAccess = await getPremiumAccess(userId);
    if (quiz.audience === 'premium' && !premiumAccess.isPremium) {
      return NextResponse.json(
        { error: 'Este quiz e exclusivo para assinantes Fiel Premium.', requiresPremium: true },
        { status: 403 }
      );
    }

    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        quizId,
        completedAt: { not: null },
      },
      select: { id: true },
    });

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'Voce ja respondeu este quiz.' },
        { status: 409 }
      );
    }

    // Create quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        startedAt: new Date(),
      },
    });

    let totalScore = 0;
    let correctAnswers = 0;
    // Process each answer
    const submittedAnswers = answers as SubmittedAnswer[];

    for (const answer of submittedAnswers) {
      const questionId = String(answer.questionId || '');
      const question = quiz.questions.find((q) => q.id === questionId);
      if (!question) continue;

      const rawTimeTaken = Number(answer.timeTaken);
      const timeTaken = Number.isFinite(rawTimeTaken)
        ? Math.max(0, Math.ceil(rawTimeTaken))
        : TIME_PER_QUESTION + 1;
      const isWithinTime = timeTaken <= TIME_PER_QUESTION;
      const submittedAnswer = String(answer.answer || '');
      const isCorrect = isWithinTime && submittedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;

      // Calculate points with speed bonus
      let pointsEarned = 0;
      if (isCorrect) {
        const speedBonus = Math.max(0, TIME_PER_QUESTION - timeTaken) * 10;
        pointsEarned = question.points + speedBonus;
      }

      totalScore += pointsEarned;

      // Save answer
      await prisma.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId,
          answer: submittedAnswer,
          isCorrect,
          timeTaken,
          pointsEarned,
        },
      });
    }

    // Calculate accuracy
    const accuracy = (correctAnswers / quiz.questions.length) * 100;

    // Update attempt
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore,
        totalPoints: totalScore,
        accuracy,
        completedAt: new Date(),
      },
    });

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          increment: totalScore,
        },
        lastActive: new Date(),
      },
      select: { phone: true, name: true },
    });

    if (quiz.audience === 'free' && !premiumAccess.isPremium && updatedUser.phone) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
      await enqueuePostQuizCta({
        userId,
        phone: updatedUser.phone,
        name: updatedUser.name,
        registrationUrl: appUrl ? `${appUrl}/dashboard/settings` : '/dashboard/settings',
        score: totalScore,
        correctAnswers,
        totalQuestions: quiz.questions.length,
      }).catch((error) => {
        console.error('[Quiz Submit] Failed to enqueue post-quiz CTA:', error instanceof Error ? error.message : error);
      });
    }

    return NextResponse.json({
      attemptId: completedAttempt.id,
      quizId: quiz.id,
      audience: quiz.audience,
      score: totalScore,
      accuracy,
      correctAnswers,
      totalQuestions: quiz.questions.length,
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
