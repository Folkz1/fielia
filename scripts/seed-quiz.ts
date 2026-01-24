
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 10));
}

async function main() {
  console.log('Seeding mock data for Quiz...');

  // 1. Ensure Mock User exists
  const user = await prisma.user.upsert({
    where: { id: 'mock-user-id' },
    update: {},
    create: {
      id: 'mock-user-id',
      email: 'torcedor@fiel.ia',
      name: 'Torcedor Fiel',
      password: 'mock-password', // In real app this would be hashed
      role: 'USER',
      totalPoints: 1250,
      streak: 7,
    },
  });
  console.log('Mock User verified:', user.id);

  // 2. Ensure Mock Quiz exists
  const quiz = await prisma.quiz.upsert({
    where: { id: 'quiz-semana-1' },
    update: {},
    create: {
      id: 'quiz-semana-1',
      title: 'Quiz Semanal #1',
      description: 'Teste seus conhecimentos sobre o Timão',
      week: 1,
      year: 2025,
      active: true,
      questions: {
        create: [
          {
            id: 'q1',
            text: 'Em que ano o Corinthians foi fundado?',
            options: ['1910', '1912', '1915', '1920'],
            correctAnswer: '1910',
            points: 100,
            order: 1,
          },
          {
            id: 'q2',
            text: 'Quantos títulos mundiais o Corinthians possui?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '2',
            points: 100,
            order: 2,
          },
          {
            id: 'q3',
            text: 'Qual é o apelido do estádio do Corinthians?',
            options: ['Itaquerão', 'Pacaembu', 'Morumbi', 'Allianz'],
            correctAnswer: 'Itaquerão',
            points: 100,
            order: 3,
          },
        ],
      },
    },
  });
  console.log('Mock Quiz verified:', quiz.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
