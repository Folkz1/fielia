import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'fiel@corinthians.com' },
    update: {},
    create: {
      email: 'fiel@corinthians.com',
      name: 'Fiel Torcedor',
      password: hashedPassword,
      totalPoints: 1250,
      currentStreak: 7,
      maxStreak: 14,
      isPremium: true,
    },
  });

  console.log('✅ User created:', user.email);

  // Create quiz
  const quiz = await prisma.quiz.upsert({
    where: { id: 'quiz-semana-1' },
    update: {},
    create: {
      id: 'quiz-semana-1',
      title: 'Quiz Corinthians - Semana 1',
      description: 'Teste seus conhecimentos sobre o Timão!',
      difficulty: 'medium',
      category: 'history',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions: {
        create: [
          {
            question: 'Em que ano o Corinthians foi fundado?',
            options: ['1910', '1912', '1915', '1920'],
            correctAnswer: '1910',
            points: 100,
            order: 1,
          },
          {
            question: 'Quantos títulos mundiais o Corinthians possui?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '2',
            points: 100,
            order: 2,
          },
          {
            question: 'Qual é o apelido do estádio do Corinthians?',
            options: ['Itaquerão', 'Pacaembu', 'Morumbi', 'Allianz'],
            correctAnswer: 'Itaquerão',
            points: 100,
            order: 3,
          },
          {
            question: 'Quem foi o artilheiro do Mundial de 2012?',
            options: ['Paolo Guerrero', 'Emerson Sheik', 'Danilo', 'Paulinho'],
            correctAnswer: 'Paolo Guerrero',
            points: 100,
            order: 4,
          },
          {
            question: 'Em que ano o Corinthians conquistou a Libertadores?',
            options: ['2010', '2011', '2012', '2013'],
            correctAnswer: '2012',
            points: 100,
            order: 5,
          },
          {
            question: 'Qual jogador é conhecido como "Fenômeno"?',
            options: ['Ronaldo', 'Rivaldo', 'Romário', 'Ronaldinho'],
            correctAnswer: 'Ronaldo',
            points: 100,
            order: 6,
          },
          {
            question: 'Quantos Campeonatos Brasileiros o Corinthians tem?',
            options: ['5', '6', '7', '8'],
            correctAnswer: '7',
            points: 100,
            order: 7,
          },
          {
            question: 'Qual foi o ano da Democracia Corinthiana?',
            options: ['1980-1984', '1982-1984', '1985-1987', '1990-1992'],
            correctAnswer: '1982-1984',
            points: 100,
            order: 8,
          },
          {
            question: 'Quem é o maior ídolo da história do Corinthians?',
            options: ['Sócrates', 'Rivelino', 'Cássio', 'Marcelinho Carioca'],
            correctAnswer: 'Sócrates',
            points: 100,
            order: 9,
          },
          {
            question: 'Qual a capacidade da Neo Química Arena?',
            options: ['42.000', '47.000', '49.000', '52.000'],
            correctAnswer: '49.000',
            points: 100,
            order: 10,
          },
        ],
      },
    },
  });

  console.log('✅ Quiz created:', quiz.title);

  // Create news
  const news = await prisma.news.createMany({
    data: [
      {
        title: 'Corinthians vence clássico no Morumbi',
        summary: 'Timão bate o rival por 2x1 com gols de Yuri Alberto e Róger Guedes.',
        content: 'O Corinthians conquistou uma vitória importante no clássico contra o São Paulo, vencendo por 2x1 no Morumbi. Os gols foram marcados por Yuri Alberto e Róger Guedes.',
        category: 'Jogos',
      },
      {
        title: 'Reforços chegam para a temporada 2025',
        summary: 'Diretoria anuncia contratação de três jogadores para fortalecer o elenco.',
        content: 'A diretoria do Corinthians oficializou a contratação de três reforços para a temporada 2025, visando fortalecer o elenco para as competições.',
        category: 'Transferências',
      },
      {
        title: 'Fiel lota Arena em treino aberto',
        summary: 'Mais de 30 mil torcedores compareceram ao treino aberto na Neo Química Arena.',
        content: 'A Fiel Torcida mostrou mais uma vez sua força e paixão, lotando a Neo Química Arena em treino aberto do elenco.',
        category: 'Torcida',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ News created:', news.count);

  // Create Corinthians knowledge base
  await prisma.corinthiansKnowledge.createMany({
    data: [
      {
        title: 'Fundação do Corinthians',
        content: 'O Sport Club Corinthians Paulista foi fundado em 1º de setembro de 1910, por um grupo de operários do bairro do Bom Retiro, em São Paulo.',
        category: 'history',
        source: 'História Oficial',
      },
      {
        title: 'Mundial de Clubes 2000',
        content: 'O Corinthians conquistou seu primeiro título mundial em 2000, vencendo o Vasco da Gama na final por 4x3 nos pênaltis, após empate em 0x0 no tempo normal.',
        category: 'titles',
        source: 'História Oficial',
      },
      {
        title: 'Mundial de Clubes 2012',
        content: 'Em 2012, o Corinthians conquistou o bicampeonato mundial ao vencer o Chelsea por 1x0, com gol de Paolo Guerrero, em Yokohama, no Japão.',
        category: 'titles',
        source: 'História Oficial',
      },
      {
        title: 'Democracia Corinthiana',
        content: 'Entre 1982 e 1984, o Corinthians viveu a Democracia Corinthiana, movimento liderado por Sócrates que democratizou as decisões do clube, com jogadores votando em questões importantes.',
        category: 'history',
        source: 'História Oficial',
      },
      {
        title: 'Neo Química Arena',
        content: 'A Neo Química Arena, conhecida como Itaquerão, foi inaugurada em 2014 e tem capacidade para 49.000 torcedores. Foi palco da abertura da Copa do Mundo de 2014.',
        category: 'stadium',
        source: 'Informações Oficiais',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Knowledge base created');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
