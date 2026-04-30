import { prisma } from '@/lib/prisma';
import { sendChatCompletion } from '@/lib/openrouter';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  points?: number;
};

type GeneratedQuiz = {
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions: QuizQuestion[];
};

const EVERGREEN_FACTS = [
  'Fundado em 1910 no bairro do Bom Retiro, São Paulo.',
  'Títulos: 2 Mundiais (2000, 2012), 1 Libertadores (2012), 7 Brasileiros, 30 Paulistas.',
  'Ídolos: Sócrates, Rivelino, Marcelinho Carioca, Ronaldo, Cássio.',
  'Estádio: Neo Química Arena (Itaquerão), em Itaquera.',
  'Democracia Corinthiana como marco histórico do clube.',
  'Maior torcida de São Paulo e uma das maiores do Brasil.',
  'Gaviões da Fiel é a principal torcida organizada.',
  'Maior rivalidade: Palmeiras (Derby Paulista).',
  'Ano do primeiro Mundial: 2000; segundo: 2012.',
  'Maior artilheiro histórico: Cláudio (considerado por muitas fontes).',
];

function safeJsonParse(raw: string): any | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const start =
    firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)
      ? firstBracket
      : firstBrace;
  if (start === -1) return null;
  const end = trimmed.lastIndexOf(start === firstBracket ? ']' : '}');
  if (end === -1) return null;
  const jsonText = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizeQuiz(quiz: GeneratedQuiz, fallbackTitle: string, questionCount: number) {
  const questions = (quiz.questions || [])
    .filter((q) => q && q.question && Array.isArray(q.options))
    .map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 4),
      correctAnswer: String(q.correctAnswer || '').trim(),
      points: Number(q.points || 100),
    }))
    .map((q) => {
      let correctAnswer = q.correctAnswer;
      if (!q.options.includes(correctAnswer)) {
        const letterMatch = correctAnswer.match(/^[A-Da-d]$/);
        if (letterMatch) {
          const idx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          correctAnswer = q.options[idx] || correctAnswer;
        } else {
          const byPrefix = q.options.find(
            (opt) => opt.toLowerCase().startsWith(`${correctAnswer.toLowerCase()}.`)
          );
          if (byPrefix) correctAnswer = byPrefix;
        }
      }
      return { ...q, correctAnswer };
    })
    .filter((q) => q.question && q.options.length >= 4 && q.options.includes(q.correctAnswer))
    .slice(0, questionCount);

  return {
    title: quiz.title?.trim() || fallbackTitle,
    description: quiz.description?.trim() || '',
    category: quiz.category?.trim() || 'noticias',
    difficulty: quiz.difficulty?.trim() || 'medium',
    questions,
  };
}

async function getRecentNews(windowDays: number) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return prisma.news.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: {
      title: true,
      summary: true,
      sourceUrl: true,
      publishedAt: true,
    },
  });
}

async function requestQuizGeneration(count: number, questionCount: number, newsDigest: string) {
  const system = `Você é um redator de quizzes sobre o Corinthians.
Gere quizzes semanais com perguntas objetivas e 4 alternativas.
Misture perguntas de notícias recentes e conhecimento histórico do clube.
Regras:
- Cada quiz deve ter ${questionCount} perguntas.
- Cada quiz deve ter pelo menos 2 perguntas baseadas nas notícias e 2 de conhecimento histórico.
- Evite repetir perguntas entre quizzes.
- Responda somente com JSON válido.`;

  const user = `Notícias recentes:
${newsDigest}

Fatos históricos permanentes:
${EVERGREEN_FACTS.map((f) => `- ${f}`).join('\n')}

Gere ${count} quizzes no formato JSON:
{
  "quizzes": [
    {
      "title": "...",
      "description": "...",
      "category": "noticias|historia|geral",
      "difficulty": "easy|medium|hard",
      "questions": [
        {
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "points": 100
        }
      ]
    }
  ]
}`;

  const response = await sendChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.4, maxTokens: 3500 }
  );

  return response.content;
}

export async function generateWeeklyQuizzes(options?: {
  count?: number;
  questionCount?: number;
  windowDays?: number;
  activateFirst?: boolean;
  audience?: 'free' | 'premium';
  cadence?: 'monthly' | 'weekly';
}) {
  const count = Math.max(1, options?.count || 1);
  const questionCount = Math.max(1, options?.questionCount || 5);
  const windowDays = Math.max(1, options?.windowDays || 7);
  const activateFirst = options?.activateFirst !== false;
  const audience = options?.audience || 'premium';
  const cadence = options?.cadence || (audience === 'premium' ? 'weekly' : 'monthly');

  const news = await getRecentNews(windowDays);
  const newsDigest = news
    .map(
      (n, idx) =>
        `${idx + 1}. ${n.title} (${n.publishedAt.toISOString().slice(0, 10)})\n${n.summary}`
    )
    .join('\n\n');

  const raw = await requestQuizGeneration(count, questionCount, newsDigest);
  const parsed = safeJsonParse(raw);
  const quizzes: GeneratedQuiz[] = Array.isArray(parsed?.quizzes) ? parsed.quizzes : [];

  if (quizzes.length === 0) {
    throw new Error('AI did not return any quizzes');
  }

  const createdIds: string[] = [];
  const now = new Date();

  if (activateFirst) {
    await prisma.quiz.updateMany({
      where: { isActive: true, audience, cadence },
      data: { isActive: false },
    });
  }

  for (let i = 0; i < Math.min(count, quizzes.length); i++) {
    const fallbackTitle = `Quiz Semanal ${i + 1}`;
    const normalized = normalizeQuiz(quizzes[i], fallbackTitle, questionCount);
    if (normalized.questions.length < questionCount) continue;

    const startDate = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const quiz = await prisma.quiz.create({
      data: {
        title: normalized.title,
        description: normalized.description,
        category: normalized.category,
        difficulty: normalized.difficulty,
        audience,
        cadence,
        isActive: activateFirst && i === 0,
        startDate,
        endDate,
        questions: { create: normalized.questions.map((q, idx) => ({ ...q, order: idx })) },
      },
    });

    createdIds.push(quiz.id);
  }

  return { created: createdIds.length, quizIds: createdIds };
}

export async function generateWeeklyQuizIfMissing() {
  const now = new Date();
  const active = await prisma.quiz.findFirst({
    where: {
      audience: 'premium',
      cadence: 'weekly',
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (active) {
    return { status: 'skipped', reason: 'active_quiz_exists', quizId: active.id };
  }

  const questionCount = Number.parseInt(process.env.QUIZ_WEEKLY_QUESTION_COUNT || '5', 10) || 5;
  return generateWeeklyQuizzes({
    count: 1,
    questionCount,
    activateFirst: true,
    audience: 'premium',
    cadence: 'weekly',
  });
}
