const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function startOfWeekUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1); // Monday
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfWeekUTC(date) {
  const start = startOfWeekUTC(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

async function main() {
  const points = Math.max(parseInt(process.env.QUIZ_WEEKLY_POINTS || '150', 10) || 150, 50);
  const now = new Date();
  const startDate = startOfWeekUTC(now);
  const endDate = endOfWeekUTC(now);

  await prisma.quiz.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: 'Quiz Semanal - Corinthians',
      description: '3 perguntas sobre o Corinthians e notícias recentes.',
      difficulty: 'medium',
      category: 'news',
      isActive: true,
      startDate,
      endDate,
      questions: {
        create: [
          {
            question: 'Em que ano o Corinthians foi fundado?',
            options: ['1910', '1912', '1915', '1920'],
            correctAnswer: '1910',
            points,
            order: 1,
          },
          {
            question: 'Quantos títulos mundiais o Corinthians possui?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '2',
            points,
            order: 2,
          },
          {
            question: 'Qual é o apelido da Neo Química Arena?',
            options: ['Itaquerão', 'Pacaembu', 'Morumbi', 'Allianz'],
            correctAnswer: 'Itaquerão',
            points,
            order: 3,
          },
        ],
      },
    },
  });

  console.log(`Weekly quiz created: ${quiz.id}`);
}

main()
  .catch((error) => {
    console.error('Weekly quiz seed failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
