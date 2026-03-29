import { prisma } from '@/lib/prisma';
import { sendChatCompletion } from '@/lib/openrouter';
import { rewriteNewsWithAI } from '@/lib/news/rewrite';
import { dedupeNewsItems } from '@/lib/news/dedupe';

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  publishedAt: Date;
  sourceUrl: string | null;
};

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function runNewsCuration() {
  const limit = Math.max(
    1,
    Number.parseInt(process.env.NEWS_CURATION_LIMIT || '3', 10) || 3
  );
  const windowHours = Math.max(
    1,
    Number.parseInt(process.env.NEWS_CURATION_WINDOW_HOURS || '48', 10) || 48
  );
  const useAI = (process.env.NEWS_CURATION_USE_AI || 'true').toLowerCase() === 'true';

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const recent = await prisma.news.findMany({
    where: {
      publishedAt: { gte: since },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(30, limit * 12),
    select: {
      id: true,
      title: true,
      summary: true,
      publishedAt: true,
      sourceUrl: true,
      createdAt: true,
      updatedAt: true,
      content: true,
      imageUrl: true,
    },
  });

  const uniqueRecent = dedupeNewsItems(recent) as NewsItem[];
  if (!uniqueRecent.length) {
    return { created: false, reason: 'no_recent_news' };
  }

  let topIds = uniqueRecent.slice(0, limit).map((item) => item.id);

  if (useAI) {
    const lines = uniqueRecent.map((item, index) => {
      const summary = item.summary?.slice(0, 160).replace(/\s+/g, ' ') || '';
      return `${index + 1}. [${item.id}] ${item.title} - ${summary}`;
    });

    const system = [
      'Voce e um editor esportivo do Corinthians.',
      'Escolha as noticias mais relevantes para a torcida hoje.',
      'Priorize contratacoes, jogos, lesoes e decisoes importantes.',
      'Retorne JSON estrito no formato {"top_ids":["id1","id2","id3"]}.',
      'Retorne exatamente 3 ids se possivel.',
    ].join('\n');

    const model = process.env.OPENROUTER_CURATION_MODEL || process.env.OPENROUTER_MODEL;
    const response = await sendChatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: lines.join('\n') },
      ],
      { temperature: 0.2, maxTokens: 300, model }
    );

    const parsed = extractJson(response.content || '');
    if (parsed?.top_ids && Array.isArray(parsed.top_ids)) {
      const valid = parsed.top_ids
        .map((id: unknown) => String(id))
        .filter((id: string) => uniqueRecent.some((item) => item.id === id));
      if (valid.length) {
        topIds = valid.slice(0, limit);
      }
    }
  }

  if (topIds.length < limit) {
    const seen = new Set(topIds);
    for (const item of uniqueRecent) {
      if (!seen.has(item.id)) {
        topIds.push(item.id);
        seen.add(item.id);
      }
      if (topIds.length >= limit) break;
    }
  }

  const today = startOfDayUTC(new Date());
  await prisma.newsCuration.upsert({
    where: { date: today },
    update: { topIds },
    create: { date: today, topIds },
  });

  let rewritten = 0;
  if (useAI && process.env.OPENROUTER_API_KEY) {
    const topNews = await prisma.news.findMany({
      where: { id: { in: topIds } },
      select: { id: true, title: true, summary: true, content: true, category: true, sourceUrl: true },
    });

    for (const item of topNews) {
      const content = (item.content || '').trim();
      const hasRawHtml = /<[a-z][\s\S]*>/i.test(content);
      const isTooShort = content.length < 500;
      if (!hasRawHtml && !isTooShort) continue;

      try {
        const sourceText = content || item.summary || item.title;
        if (sourceText.length < 100) continue;

        const result = await rewriteNewsWithAI({
          title: item.title,
          category: item.category,
          sourceText,
        });

        await prisma.news.update({
          where: { id: item.id },
          data: {
            title: result.title,
            summary: result.summary,
            content: result.content,
          },
        });
        rewritten++;
      } catch (error) {
        console.warn(`[curation] Rewrite failed for news ${item.id}:`, error);
      }
    }
  }

  return { created: true, topIds, rewritten };
}
