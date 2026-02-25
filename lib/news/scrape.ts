import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

type ScrapedArticle = {
  title: string | null;
  excerpt: string | null;
  text: string | null;
  imageUrl: string | null;
};

function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function pickMetaContent(doc: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value = doc.querySelector(selector)?.getAttribute('content')?.trim();
    if (value) return value;
  }
  return null;
}

function resolveMaybeUrl(base: string, maybeUrl: string | null) {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

export async function scrapeArticleFromUrl(url: string): Promise<ScrapedArticle | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FielIA/1.0; +https://fielchat.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
      },
    });

    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 400) return null;

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    const metaImage = pickMetaContent(doc, [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]);

    const reader = new Readability(doc);
    const article = reader.parse();

    const title = article?.title?.trim() || doc.title?.trim() || null;
    const excerpt = article?.excerpt?.trim() || null;
    const text = article?.textContent ? normalizeText(article.textContent) : null;
    const imageUrl = resolveMaybeUrl(url, metaImage);

    if (!text || text.length < 300) {
      return { title, excerpt, text: null, imageUrl };
    }

    return { title, excerpt, text, imageUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
