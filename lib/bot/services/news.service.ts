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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function getRecentDeduped(limit: number, windowHours: number) {
  try {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recent = await prisma.news.findMany({
      where: {
        publishedAt: {
          gte: since,
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: Math.max(20, limit * 8),
    });

    const seen = new Set<string>();
    const curated: typeof recent = [];

    for (const item of recent) {
      const key = item.sourceUrl || normalizeText(item.title);
      if (seen.has(key)) continue;
      seen.add(key);
      curated.push(item);
      if (curated.length >= limit) break;
    }

    if (curated.length > 0) {
      return curated;
    }

    return getLatestNews(limit);
  } catch (error) {
    console.error('Error fetching curated news:', error);
    return getLatestNews(limit);
  }
}

export async function getCuratedNews(limit: number = 3, windowHours: number = 24) {
  try {
    const today = startOfDayUTC(new Date());
    const curation = await prisma.newsCuration.findUnique({
      where: { date: today },
    });

    if (curation?.topIds?.length) {
      const items = await prisma.news.findMany({
        where: { id: { in: curation.topIds } },
      });
      const byId = new Map(items.map((item) => [item.id, item]));
      const ordered = curation.topIds
        .map((id) => byId.get(id))
        .filter(Boolean) as typeof items;

      if (ordered.length) {
        console.info(
          `news.curated source=curation date=${today.toISOString()} total=${ordered.length} limit=${limit}`
        );
        return ordered.slice(0, limit);
      }
    }

    console.info(
      `news.curated source=fallback windowHours=${windowHours} limit=${limit} hasCuration=${Boolean(
        curation?.topIds?.length
      )}`
    );
    return getRecentDeduped(limit, windowHours);
  } catch (error) {
    console.error('Error fetching curated news:', error);
    return getLatestNews(limit);
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
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const url = item.id ? (base ? `${base}/news/${item.id}` : `/news/${item.id}`) : '';
    if (url) {
      message += `${url}\n`;
    }
    message += "\n";
  });

  return message.trim();
}
