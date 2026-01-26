import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FeedItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
};

function parseFeedUrls(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-news-sync-secret');
    const expected = process.env.NEWS_SYNC_SECRET;

    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feedUrls = parseFeedUrls(process.env.NEWS_FEEDS);
    if (feedUrls.length === 0) {
      return NextResponse.json({ error: 'No NEWS_FEEDS configured' }, { status: 400 });
    }

    const itemLimit = Math.max(
      1,
      Number.parseInt(process.env.NEWS_FEED_ITEM_LIMIT || '5', 10) || 5
    );
    const defaultCategory = process.env.NEWS_DEFAULT_CATEGORY || 'Geral';

    const { default: Parser } = await import('rss-parser');
    const parser = new Parser();

    let created = 0;
    let skipped = 0;

    for (const url of feedUrls) {
      const feed = await parser.parseURL(url);
      const items = (feed.items || []) as FeedItem[];

      for (const item of items.slice(0, itemLimit)) {
        const title = item.title?.trim();
        const link = item.link?.trim();

        if (!title) {
          skipped += 1;
          continue;
        }

        if (link) {
          const existing = await prisma.news.findFirst({
            where: { sourceUrl: link },
            select: { id: true },
          });

          if (existing) {
            skipped += 1;
            continue;
          }
        }

        const summary = (item.contentSnippet || item.content || title).toString().slice(0, 280);
        const content = (item.content || item.contentSnippet || title).toString();
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();

        await prisma.news.create({
          data: {
            title,
            summary,
            content,
            category: defaultCategory,
            sourceUrl: link,
            publishedAt,
          },
        });

        created += 1;
      }
    }

    return NextResponse.json({ created, skipped, feeds: feedUrls.length });
  } catch (error) {
    console.error('News Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news' },
      { status: 500 }
    );
  }
}
