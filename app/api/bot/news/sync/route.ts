import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type FeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
};

function buildFeedUrl() {
  const base = (process.env.FRESHRSS_URL || '').replace(/\/$/, '');
  const explicit = process.env.FRESHRSS_FEED_URL || '';
  if (explicit) return explicit;

  const category = process.env.FRESHRSS_CATEGORY_ID || '';
  const format = process.env.FRESHRSS_FEED_FORMAT || 'rss';

  if (!base || !category) return '';

  return `${base}/i/?a=${encodeURIComponent(format)}&get=${encodeURIComponent(category)}`;
}

function buildAuthHeader() {
  const user = process.env.FRESHRSS_USER;
  const pass = process.env.FRESHRSS_PASS;
  if (!user || !pass) return undefined;
  const token = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${token}`;
}

function pickCategory() {
  return process.env.NEWS_DEFAULT_CATEGORY || 'Geral';
}

function toDate(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function fetchFeedItems(url: string, authHeader?: string) {
  const parser = new Parser();
  const res = await fetch(url, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FreshRSS error ${res.status}: ${text}`);
  }

  const xml = await res.text();
  const feed = await parser.parseString(xml);
  return (feed.items || []) as FeedItem[];
}

async function itemExists(item: FeedItem) {
  if (item.link) {
    const existing = await prisma.news.findFirst({
      where: { sourceUrl: item.link },
      select: { id: true },
    });
    return Boolean(existing);
  }

  if (item.title && item.isoDate) {
    const existing = await prisma.news.findFirst({
      where: { title: item.title, publishedAt: toDate(item.isoDate) },
      select: { id: true },
    });
    return Boolean(existing);
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.NEWS_SYNC_SECRET;
    const provided = req.headers.get('x-news-sync-secret');
    if (expected && provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = buildFeedUrl();
    if (!url) {
      return NextResponse.json(
        { error: 'Missing FRESHRSS_URL / FRESHRSS_FEED_URL / FRESHRSS_CATEGORY_ID' },
        { status: 400 }
      );
    }

    const limit = Math.max(
      1,
      Number.parseInt(process.env.NEWS_FEED_ITEM_LIMIT || '10', 10) || 10
    );

    const authHeader = buildAuthHeader();
    const items = await fetchFeedItems(url, authHeader);
    const category = pickCategory();

    let created = 0;
    let skipped = 0;

    for (const item of items.slice(0, limit)) {
      if (!item.title) {
        skipped += 1;
        continue;
      }

      if (await itemExists(item)) {
        skipped += 1;
        continue;
      }

      const summary = item.contentSnippet || item.content || item.title;
      const content = item.content || item.contentSnippet || item.title;

      await prisma.news.create({
        data: {
          title: item.title,
          summary,
          content,
          category,
          sourceUrl: item.link || null,
          publishedAt: toDate(item.isoDate),
        },
      });

      created += 1;
    }

    return NextResponse.json({
      fetched: items.length,
      created,
      skipped,
      category,
    });
  } catch (error) {
    console.error('News sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news' },
      { status: 500 }
    );
  }
}
