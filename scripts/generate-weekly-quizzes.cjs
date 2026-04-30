const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

async function loadOpenRouter() {
  const mod = await import('@openrouter/sdk');
  return mod.OpenRouter;
}

function safeJsonParse(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
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

function normalizeQuiz(quiz, fallbackTitle, questionCount) {
  const questions = (quiz.questions || [])
    .filter((q) => q && q.question && Array.isArray(q.options))
    .map((q) => ({
      question: String(q.question).trim(),
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
    title: (quiz.title || fallbackTitle).trim(),
    description: (quiz.description || '').trim(),
    category: (quiz.category || 'noticias').trim(),
    difficulty: (quiz.difficulty || 'medium').trim(),
    questions,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const OpenRouter = await loadOpenRouter();
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const count = Number.parseInt(process.env.QUIZ_SEED_COUNT || '10', 10) || 10;
  const questionCount =
    Number.parseInt(process.env.QUIZ_WEEKLY_QUESTION_COUNT || '5', 10) || 5;
  const windowDays = Number.parseInt(process.env.QUIZ_NEWS_WINDOW_DAYS || '7', 10) || 7;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const news = await prisma.news.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 12,
    select: { title: true, summary: true, publishedAt: true },
  });

  const newsDigest = news
    .map(
      (n, idx) =>
        `${idx + 1}. ${n.title} (${n.publishedAt.toISOString().slice(0, 10)})\n${n.summary}`
    )
    .join('\n\n');

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

  await prisma.quiz.updateMany({
    where: { isActive: true, audience: 'premium', cadence: 'weekly' },
    data: { isActive: false },
  });

  const created = [];
  const now = new Date();
  let cursor = 0;

  while (created.length < count) {
    const remaining = count - created.length;
    const batchCount = Math.min(2, remaining);

    const response = await client.chat.send({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free",
      messages: [
        { role: 'system', content: system.replace(`${count}`, `${batchCount}`) },
        { role: 'user', content: user.replace(`Gere ${count} quizzes`, `Gere ${batchCount} quizzes`) },
      ],
      temperature: 0.4,
      maxTokens: 2200,
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    let content = '';
    if (typeof rawContent === 'string') {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      content = rawContent
        .filter((c) => c && c.type === 'output_text')
        .map((c) => c.text || '')
        .join('');
    }

    const parsed = safeJsonParse(content);
    const quizzes = Array.isArray(parsed?.quizzes) ? parsed.quizzes : [];

    if (quizzes.length === 0) {
      console.error('Raw AI response (preview):', content.slice(0, 800));
      throw new Error('AI did not return quizzes');
    }

    for (let i = 0; i < quizzes.length && created.length < count; i++) {
      const normalized = normalizeQuiz(quizzes[i], `Quiz Semanal ${created.length + 1}`, questionCount);
      if (normalized.questions.length < questionCount) continue;

      const startDate = new Date(now.getTime() + cursor * 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const quiz = await prisma.quiz.create({
        data: {
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          difficulty: normalized.difficulty,
          audience: 'premium',
          cadence: 'weekly',
          isActive: cursor === 0,
          startDate,
          endDate,
          questions: { create: normalized.questions.map((q, idx) => ({ ...q, order: idx })) },
        },
      });
      created.push(quiz.id);
      cursor += 1;
    }
  }

  console.log(`Weekly quizzes created: ${created.length}`);
  console.log(created);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Quiz generation failed:', error.message);
  process.exit(1);
});
