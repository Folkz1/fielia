import { prisma } from '@/lib/prisma';

export async function getLatestNews(limit: number = 3) {
  try {
    const news = await prisma.news.findMany({
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });
    return news;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export function formatNewsMessage(news: any[]) {
  if (news.length === 0) {
    return "📰 *Notícias do Timão*\n\nNão encontrei notícias recentes. Estamos buscando as últimas informações para você!";
  }

  let message = "📰 *Últimas do Timão*\n\n";
  news.forEach((item, index) => {
    message += `*${index + 1}. ${item.title}*\n`;
    message += `${item.summary}\n`;
    if (item.sourceUrl) {
      message += `[Ler mais](${item.sourceUrl})\n`;
    }
    message += "\n";
  });

  return message.trim();
}
