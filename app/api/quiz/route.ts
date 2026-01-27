import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const now = new Date();

    const activeQuiz = await prisma.quiz.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    let userAttempt = null;

    if (activeQuiz && userId) {
      userAttempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: activeQuiz.id,
          userId: userId,
          completedAt: { not: null },
        },
      });
    }

    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({ activeQuiz, userAttempt, quizzes });
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

    if (
      !title ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalizedQuestions = questions.map((q: any, index: number) => ({
      question: String(q.question || "").trim(),
      options: Array.isArray(q.options)
        ? q.options.map((o: string) => String(o).trim())
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
      where: { isActive: true },
      data: { isActive: false },
    });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        category: category || "general",
        difficulty: difficulty || "medium",
        isActive: true,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate
          ? new Date(endDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
