import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const period = searchParams.get('period'); // '24h', '48h', '7d'
    const limit = parseInt(searchParams.get('limit') || '50');
    const curated = searchParams.get('curated') === 'true';

    // If requesting curated news
    if (curated) {
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
          .filter(Boolean);

        return NextResponse.json({
          news: ordered.slice(0, 3),
          curation: {
            date: curation.createdAt,
            hasToday: true
          }
        });
      }

      // Fallback to latest 3
      const fallback = await prisma.news.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 3,
      });

      return NextResponse.json({
        news: fallback,
        curation: {
          date: new Date(),
          hasToday: false
        }
      });
    }

    // Build where clause
    const where: any = {};

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

    const news = await prisma.news.findMany({
      where,
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ news });
  } catch (error) {
    console.error('Fetch News Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
