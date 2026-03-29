import { prisma } from '@/lib/prisma';
import { scrapeArticleFromUrl } from '@/lib/news/scrape';
import { rewriteNewsWithAI } from '@/lib/news/rewrite';
import { buildNewsFallbackFromSource } from '@/lib/news/fallback';

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
    const fallback = buildNewsFallbackFromSource({
      currentTitle: news.title,
      currentSummary: news.summary,
      sourceText: scrapedText,
      scrapedExcerpt: scraped?.excerpt || null,
    });

    if (!news.imageUrl && scraped?.imageUrl) {
      data.imageUrl = scraped.imageUrl;
    }

    if ((news.content || '').trim().length < fallback.content.length) {
      data.content = fallback.content;
    }
    if (!(news.summary || '').trim() || (news.summary || '').trim().length < 120) {
      data.summary = fallback.summary;
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
      console.warn('News rewrite failed (using scraped fallback):', error);
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
