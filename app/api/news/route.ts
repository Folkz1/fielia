import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dedupeNewsItems } from '@/lib/news/dedupe';

type NewsRecord = Awaited<ReturnType<typeof prisma.news.findMany>>[number];

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const period = searchParams.get('period');
    const limit = parseInt(searchParams.get('limit') || '50');
    const curated = searchParams.get('curated') === 'true';

    if (curated) {
      const today = startOfDayUTC(new Date());
      const curation = await prisma.newsCuration.findUnique({
        where: { date: today },
      });

      if (curation?.topIds?.length) {
        const items = await prisma.news.findMany({
          where: { id: { in: curation.topIds } },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        });
        const byId = new Map(items.map((item) => [item.id, item]));
        const ordered = curation.topIds
          .map((id) => byId.get(id))
          .filter((item): item is NewsRecord => Boolean(item));

        const deduped = dedupeNewsItems(ordered, 3);
        if (deduped.length < 3) {
          const fallback = await prisma.news.findMany({
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: 24,
          });
          const merged = dedupeNewsItems([...deduped, ...fallback], 3);
          return NextResponse.json({
            news: merged,
            curation: {
              date: curation.createdAt,
              hasToday: true,
            },
          });
        }

        return NextResponse.json({
          news: deduped,
          curation: {
            date: curation.createdAt,
            hasToday: true,
          },
        });
      }

      const fallback = await prisma.news.findMany({
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 24,
      });

      return NextResponse.json({
        news: dedupeNewsItems(fallback, 3),
        curation: {
          date: new Date(),
          hasToday: false,
        },
      });
    }

    const where: Record<string, unknown> = {};

    if (category && category !== 'Todas') {
      where.category = category;
    }

    if (period) {
      const now = new Date();
      let hoursAgo: number;

      switch (period) {
        case '24h':
          hoursAgo = 24;
          break;
        case '48h':
          hoursAgo = 48;
          break;
        case '7d':
          hoursAgo = 24 * 7;
          break;
        default:
          hoursAgo = 24;
      }

      where.publishedAt = {
        gte: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
      };
    }

    const fetchTake = Math.max(limit, Math.min(limit * 6, 300));
    const news = await prisma.news.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: fetchTake,
    });

    const response = NextResponse.json({ news: dedupeNewsItems(news, limit) });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Fetch News Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
