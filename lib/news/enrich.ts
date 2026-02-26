import { prisma } from '@/lib/prisma';
import { scrapeArticleFromUrl } from '@/lib/news/scrape';
import { rewriteNewsWithAI } from '@/lib/news/rewrite';

export type NewsForRendering = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: Date;
};

const inFlight = new Map<string, Promise<NewsForRendering>>();

function truncate(input: string, max: number) {
  const value = input.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}

function compactWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function shouldEnrich(news: NewsForRendering) {
  const content = (news.content || '').trim();
  const summary = (news.summary || '').trim();

  if (!news.sourceUrl) return false;
  if (!content) return true;
  if (content.length < 300) return true;
  if (summary && content.length <= summary.length + 10) return true;
  return false;
}

export async function enrichNewsIfNeeded(news: NewsForRendering): Promise<NewsForRendering> {
  if (!shouldEnrich(news)) return news;
  if (!news.sourceUrl) return news;

  const existing = inFlight.get(news.id);
  if (existing) return existing;

  const promise = (async () => {
    const scraped = await scrapeArticleFromUrl(news.sourceUrl as string);
    const scrapedText = scraped?.text?.trim() || '';
    if (!scrapedText || scrapedText.length < 300) return news;

    const data: Record<string, unknown> = {};

    if (!news.imageUrl && scraped?.imageUrl) {
      data.imageUrl = scraped.imageUrl;
    }

    try {
      const rewritten = await rewriteNewsWithAI({
        title: news.title,
        category: news.category,
        sourceText: scrapedText,
      });
      data.title = rewritten.title;
      data.summary = rewritten.summary;
      data.content = rewritten.content;
    } catch (error) {
      console.warn('News rewrite failed (keeping existing text):', error);
    }

    if (Object.keys(data).length === 0) return news;

    const updated = await prisma.news.update({
      where: { id: news.id },
      data,
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        imageUrl: true,
        sourceUrl: true,
        publishedAt: true,
      },
    });

    return updated;
  })().finally(() => {
    inFlight.delete(news.id);
  });

  inFlight.set(news.id, promise);
  return promise;
}
