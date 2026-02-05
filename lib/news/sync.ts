import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';

type FeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
  'media:content'?: {
    $?: {
      url?: string;
    };
  };
  'media:thumbnail'?: {
    $?: {
      url?: string;
    };
  };
};

// Extrai URL de imagem do item RSS
function extractImageUrl(item: FeedItem): string | null {
  // 1. Tentar enclosure (comum em RSS)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // 2. Tentar media:content
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url;
  }

  // 3. Tentar media:thumbnail
  if (item['media:thumbnail']?.$?.url) {
    return item['media:thumbnail'].$.url;
  }

  // 4. Tentar extrair do content HTML
  const content = item.content || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    return imgMatch[1];
  }

  // 5. Tentar extrair og:image do link (se disponivel)
  return null;
}

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

function toDate(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
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

export async function syncNewsFromFreshRSS() {
  const url = buildFeedUrl();
  if (!url) {
    throw new Error('Missing FRESHRSS_URL / FRESHRSS_FEED_URL / FRESHRSS_CATEGORY_ID');
  }

  const limit = Math.max(
    1,
    Number.parseInt(process.env.NEWS_FEED_ITEM_LIMIT || '10', 10) || 10
  );
  const category = process.env.NEWS_DEFAULT_CATEGORY || 'Geral';

  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content'],
        ['media:thumbnail', 'media:thumbnail'],
        ['enclosure', 'enclosure'],
      ],
    },
  });
  const authHeader = buildAuthHeader();
  const res = await fetch(url, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FreshRSS error ${res.status}: ${text}`);
  }

  const xml = await res.text();
  const feed = await parser.parseString(xml);
  const items = (feed.items || []) as FeedItem[];

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
    const imageUrl = extractImageUrl(item);

    await prisma.news.create({
      data: {
        title: item.title,
        summary,
        content,
        category,
        sourceUrl: item.link || null,
        imageUrl: imageUrl,
        publishedAt: toDate(item.isoDate),
      },
    });

    created += 1;
  }

  return {
    fetched: items.length,
    created,
    skipped,
    category,
  };
}
