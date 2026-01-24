
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// const prisma = new PrismaClient();

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

const { Client } = require('pg');

async function testPgConnection() {
  console.log('Testing PG connection...');
  if (!process.env.DATABASE_URL) throw new Error('No DATABASE_URL');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('PG Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('PG Time:', res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error('PG Connection Failed:', err);
    return false;
  }
}

async function main() {
  const pgSuccess = await testPgConnection();
  if (!pgSuccess) {
    console.error('Aborting Prisma seed due to connectivity failure.');
    return;
  }

  // Create a variable in outer scope for cleanup
  let prisma;

  try {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    
    // ... pg check ... (omitted for brevity in replacement if possible, but let's just replace the whole main start)
    // Actually, let's keep it simple.
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    
    prisma = new PrismaClient({
      adapter,
      log: ['query', 'error']
    });

    // 1. Ensure Mock User exists
    const user = await prisma.user.upsert({
      where: { id: 'mock-user-id' },
      update: {},
      create: {
        id: 'mock-user-id',
        email: 'torcedor@fiel.ia',
        name: 'Torcedor Fiel',
        password: 'mock-password',
        // role: 'USER', // Removed
        totalPoints: 1250,
        currentStreak: 7, // Fixed field name from streak to currentStreak
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
        difficulty: 'medium',
        category: 'general',
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        // week: 1, // Removed
      },
    });
    
    // Create questions separately since nested create might fail if they exist with different logic or I should use update/create.
    // Simplifying to create questions if quiz was just created or use a different logic.
    // For upsert, we can't easily upsert relations in the same call if they are many.
    // Let's just create them if they don't exist.
    
    const questionsData = [
      {
        id: 'q1',
        quizId: 'quiz-semana-1',
        question: 'Em que ano o Corinthians foi fundado?',
        options: ['1910', '1912', '1915', '1920'],
        correctAnswer: '1910',
        points: 100,
        order: 1,
      },
      {
        id: 'q2',
        quizId: 'quiz-semana-1',
        question: 'Quantos títulos mundiais o Corinthians possui?',
        options: ['1', '2', '3', '4'],
        correctAnswer: '2',
        points: 100,
        order: 2,
      },
      {
        id: 'q3',
        quizId: 'quiz-semana-1',
        question: 'Qual é o apelido do estádio do Corinthians?',
        options: ['Itaquerão', 'Pacaembu', 'Morumbi', 'Allianz'],
        correctAnswer: 'Itaquerão',
        points: 100,
        order: 3,
      },
    ];

    for (const q of questionsData) {
       await prisma.quizQuestion.upsert({
         where: { id: q.id },
         update: {},
         create: q
       });
    }

    console.log('Mock Quiz verified:', quiz.id);

  } catch (e) {
    console.error('Error seeding:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
