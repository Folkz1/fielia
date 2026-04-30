import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getPremiumAccess } from "@/lib/premium";

type QuizAudience = "free" | "premium";
type QuizCadence = "monthly" | "weekly" | "on_demand";

type RawQuestionPayload = {
  question?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  points?: unknown;
  order?: unknown;
};

function normalizeAudience(value: unknown): QuizAudience {
  return value === "premium" ? "premium" : "free";
}

function normalizeCadence(value: unknown, audience: QuizAudience): QuizCadence {
  if (value === "weekly" || value === "on_demand" || value === "monthly") {
    return value;
  }

  return audience === "premium" ? "weekly" : "monthly";
}

function publicQuiz<T extends { questions?: Array<Record<string, unknown>> }>(quiz: T | null) {
  if (!quiz) return null;

  return {
    ...quiz,
    questions: quiz.questions?.map((question) => {
      const { correctAnswer, ...safeQuestion } = question;
      void correctAnswer;
      return safeQuestion;
    }),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const premiumAccess = userId
      ? await getPremiumAccess(userId)
      : { isPremium: false, isAdmin: false, subscriptionEnd: null };

    const { searchParams } = new URL(req.url);
    const requestedAudience = normalizeAudience(searchParams.get("audience"));
    const audience: QuizAudience =
      requestedAudience === "premium" && premiumAccess.isPremium ? "premium" : "free";
    const now = new Date();

    let activeQuiz = await prisma.quiz.findFirst({
      where: {
        audience,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!activeQuiz && audience === "premium") {
      activeQuiz = await prisma.quiz.findFirst({
        where: {
          audience: "free",
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { createdAt: "desc" },
        include: { questions: { orderBy: { order: "asc" } } },
      });
    }

    let userAttempt = null;
    if (activeQuiz && userId) {
      userAttempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: activeQuiz.id,
          userId,
          completedAt: { not: null },
        },
      });
    }

    const quizzes = await prisma.quiz.findMany({
      where: premiumAccess.isPremium ? undefined : { audience: "free" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({
      activeQuiz: publicQuiz(activeQuiz),
      userAttempt,
      quizzes,
      audience,
      isPremium: premiumAccess.isPremium,
    });
  } catch (error) {
    console.error("Fetch Quiz Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      category,
      difficulty,
      startDate,
      endDate,
      questions,
    } = body || {};
    const audience = normalizeAudience(body?.audience);
    const cadence = normalizeCadence(body?.cadence, audience);

    if (
      !title ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalizedQuestions = (questions as RawQuestionPayload[]).map((q, index: number) => ({
      question: String(q.question || "").trim(),
      options: Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim())
        : [],
      correctAnswer: String(q.correctAnswer || "").trim(),
      points: Number(q.points || 100),
      order: typeof q.order === "number" ? q.order : index,
    }));

    const invalid = normalizedQuestions.some(
      (q) => !q.question || q.options.length < 2 || !q.correctAnswer,
    );
    if (invalid) {
      return NextResponse.json({ error: "Invalid questions" }, { status: 400 });
    }

    await prisma.quiz.updateMany({
      where: { isActive: true, audience, cadence },
      data: { isActive: false },
    });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        category: category || "general",
        difficulty: difficulty || "medium",
        audience,
        cadence,
        isActive: true,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate
          ? new Date(endDate)
          : new Date(Date.now() + (audience === "free" ? 7 : 3) * 24 * 60 * 60 * 1000),
        questions: { create: normalizedQuestions },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Create Quiz Error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 },
    );
  }
}
