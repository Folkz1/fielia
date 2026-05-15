import { prisma } from '@/lib/prisma';

type FreeQuizRankingRow = {
  name: string;
  totalPoints: number;
  accuracy?: number | null;
};

type FreeQuizRanking = {
  source: 'active_free_quiz' | 'free_users';
  quizTitle?: string;
  rows: FreeQuizRankingRow[];
};

export async function getTopUsers(limit: number = 10) {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        totalPoints: 'desc',
      },
      take: limit,
      select: {
        name: true,
        totalPoints: true,
      },
    });
    return users;
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return [];
  }
}

export async function getFreeQuizRanking(limit: number = 10): Promise<FreeQuizRanking> {
  try {
    const now = new Date();
    const activeQuiz = await prisma.quiz.findFirst({
      where: {
        audience: 'free',
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });

    if (activeQuiz) {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          quizId: activeQuiz.id,
          completedAt: { not: null },
        },
        orderBy: [{ totalPoints: 'desc' }, { completedAt: 'asc' }],
        take: limit,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        source: 'active_free_quiz',
        quizTitle: activeQuiz.title,
        rows: attempts.map((attempt) => ({
          name: attempt.user.name,
          totalPoints: attempt.totalPoints,
          accuracy: attempt.accuracy,
        })),
      };
    }

    const users = await prisma.user.findMany({
      where: {
        freeRegisteredAt: { not: null },
      },
      orderBy: [{ totalPoints: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
      select: {
        name: true,
        totalPoints: true,
      },
    });

    return {
      source: 'free_users',
      rows: users,
    };
  } catch (error) {
    console.error('Error fetching free quiz ranking:', error);
    return { source: 'free_users', rows: [] };
  }
}

export function formatFreeQuizRankingMessage(result: FreeQuizRanking) {
  if (result.rows.length === 0) {
    return (
      'Ranking free da Fiel\n\n' +
      'Ainda nao tem pontuacao salva no quiz free atual. Entra no quiz e puxa a fila: ' +
      `${(process.env.NEXT_PUBLIC_APP_URL || 'https://fielchat.com').replace(/\/$/, '')}/quiz-free`
    );
  }

  const title =
    result.source === 'active_free_quiz'
      ? `Ranking free do quiz: ${result.quizTitle}`
      : 'Ranking free da Fiel';

  let message = `${title}\n\n`;
  result.rows.forEach((user, index) => {
    const medal = index === 0 ? '1.' : index === 1 ? '2.' : index === 2 ? '3.' : `${index + 1}.`;
    message += `${medal} ${user.name} - ${user.totalPoints} pts`;
    if (typeof user.accuracy === 'number') {
      message += ` (${Math.round(user.accuracy)}%)`;
    }
    message += '\n';
  });

  message += `\nQuiz free: ${(process.env.NEXT_PUBLIC_APP_URL || 'https://fielchat.com').replace(/\/$/, '')}/quiz-free`;
  return message.trim();
}

export function formatRankingMessage(users: any[]) {
  if (users.length === 0) {
    return "🏆 *Ranking Fiel*\n\nAinda não temos torcedores no ranking. Comece a participar para aparecer aqui!";
  }

  let message = "🏆 *Top Torcedores Fiel IA*\n\n";
  users.forEach((user, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    message += `${medal} *${user.name}* - ${user.totalPoints} pts\n`;
  });

  message += "\nParticipe do Quiz e suba no ranking! 🚀";
  return message.trim();
}
