import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';
import { scrapeArticleFromUrl } from '@/lib/news/scrape';
import { rewriteNewsWithAI } from '@/lib/news/rewrite';
import { stripHtmlToText } from '@/lib/news/text';

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

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  const cleaned = value.trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
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
  let scraped = 0;
  let rewritten = 0;
  let rewriteFailed = 0;
  const createdNewsIds: string[] = [];
  const rewriteEnabled = (process.env.NEWS_REWRITE_USE_AI || 'true').toLowerCase() === 'true';

  for (const item of items.slice(0, limit)) {
    if (!item.title) {
      skipped += 1;
      continue;
    }

    if (await itemExists(item)) {
      skipped += 1;
      continue;
    }

    const baseTitle = compactWhitespace(item.title);
    const baseSummaryRaw = item.contentSnippet || item.title;
    const baseContentRaw = item.content || item.contentSnippet || item.title;

    const sourceUrl = item.link || null;
    let imageUrl = extractImageUrl(item);

    let sourceTextForAI = stripHtmlToText(baseContentRaw);
    if (sourceUrl) {
      const scrapedArticle = await scrapeArticleFromUrl(sourceUrl);
      if (scrapedArticle?.text && scrapedArticle.text.length >= 300) {
        sourceTextForAI = scrapedArticle.text;
        scraped += 1;
      }
      if (!imageUrl && scrapedArticle?.imageUrl) {
        imageUrl = scrapedArticle.imageUrl;
      }
    }

    // Defaults when AI is disabled/unavailable: keep a short neutral snippet.
    let finalTitle = baseTitle;
    let finalSummary = truncate(compactWhitespace(stripHtmlToText(baseSummaryRaw)), 220) || baseTitle;
    let finalContent = stripHtmlToText(baseSummaryRaw);

    if (rewriteEnabled && process.env.OPENROUTER_API_KEY && sourceTextForAI.length >= 250) {
      try {
        const rewrittenPayload = await rewriteNewsWithAI({
          title: baseTitle,
          category,
          sourceText: sourceTextForAI,
        });
        finalTitle = rewrittenPayload.title;
        finalSummary = rewrittenPayload.summary;
        finalContent = rewrittenPayload.content;
        rewritten += 1;
      } catch (error) {
        rewriteFailed += 1;
        console.warn('News rewrite failed:', error);
      }
    }

    const createdNews = await prisma.news.create({
      data: {
        title: finalTitle,
        summary: finalSummary,
        content: finalContent,
        category,
        sourceUrl,
        imageUrl,
        publishedAt: toDate(item.isoDate),
      },
    });

    createdNewsIds.push(createdNews.id);
    created += 1;
  }

  let blogGenerated = 0;
  let blogFallback = 0;
  const autoGenerateBlog = (process.env.BLOG_AUTO_GENERATE || 'false').toLowerCase() === 'true';

  if (autoGenerateBlog && createdNewsIds.length > 0) {
    const { generateBlogPostFromNews } = await import('@/lib/blog/generator');
    for (const newsId of createdNewsIds) {
      try {
        const result = await generateBlogPostFromNews({ newsId, publish: true });
        blogGenerated += result.created ? 1 : 0;
        if (result.usedFallback) blogFallback += 1;
      } catch (error) {
        console.warn(`Failed to auto-generate blog post from news ${newsId}:`, error);
      }
    }
  }

  return {
    fetched: items.length,
    created,
    skipped,
    scraped,
    rewritten,
    rewriteFailed,
    category,
    autoGenerateBlog,
    blogGenerated,
    blogFallback,
  };
}
