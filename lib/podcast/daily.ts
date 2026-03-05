import { prisma } from '@/lib/prisma';
import { getCuratedNews } from '@/lib/bot/services/news.service';
import { generatePodcast } from './generate';

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function generateDailyPodcast() {
  const today = startOfDayUTC(new Date()).toISOString().split('T')[0];

  // Verificar se ja gerou podcast hoje
  const existing: any[] = await prisma.$queryRawUnsafe(`
    SELECT id::text FROM podcasts
    WHERE title LIKE $1
    LIMIT 1
  `, `%${today}%`);

  if (existing.length > 0) {
    console.log(`[Podcast] Ja existe podcast para ${today}, pulando.`);
    return { skipped: true, date: today, existingId: existing[0].id };
  }

  // Buscar noticias curadas (max 5 das ultimas 48h)
  const news = await getCuratedNews(5, 48);

  if (!news.length) {
    console.log('[Podcast] Nenhuma noticia curada disponivel, pulando.');
    return { skipped: true, date: today, reason: 'no_news' };
  }

  // Buscar conteudo completo
  const fullNews = await prisma.news.findMany({
    where: { id: { in: news.map(n => n.id) } },
    select: { id: true, title: true, summary: true, content: true, category: true },
  });

  console.log(`[Podcast] Gerando podcast com ${fullNews.length} noticias...`);
  const result = await generatePodcast(fullNews);
  console.log(`[Podcast] Podcast "${result.title}" gerado (ID: ${result.id})`);

  return { skipped: false, date: today, podcast: result };
}
