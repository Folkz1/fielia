import { prisma } from '@/lib/prisma';

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
