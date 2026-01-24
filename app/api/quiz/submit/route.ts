import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, quizId, answers } = await req.json();

    if (!userId || !quizId || !answers) {
      return NextResponse.json(
        { error: 'userId, quizId, and answers are required' },
        { status: 400 }
      );
    }

    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
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
    const TIME_PER_QUESTION = 10;

    // Process each answer
    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = answer.answer === question.correctAnswer;
      if (isCorrect) correctAnswers++;

      // Calculate points with speed bonus
      let pointsEarned = 0;
      if (isCorrect) {
        const speedBonus = (TIME_PER_QUESTION - answer.timeTaken) * 10;
        pointsEarned = question.points + speedBonus;
      }

      totalScore += pointsEarned;

      // Save answer
      await prisma.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect,
          timeTaken: answer.timeTaken,
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
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          increment: totalScore,
        },
        lastActive: new Date(),
      },
    });

    return NextResponse.json({
      attemptId: completedAttempt.id,
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
