type DateLike = Date | string | null | undefined;

type NewsLike = {
  id: string;
  sourceUrl?: string | null;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  publishedAt?: DateLike;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  blogPost?: { id: string } | null;
};

function normalizeTitle(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toMillis(value: DateLike) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function getNewsDeduplicationKey(item: Pick<NewsLike, 'sourceUrl' | 'title' | 'publishedAt'>) {
  const sourceUrl = item.sourceUrl?.trim();
  if (sourceUrl) return `source:${sourceUrl}`;

  const title = normalizeTitle(item.title);
  const publishedAt = toMillis(item.publishedAt);
  return `title:${title}::${publishedAt}`;
}

function getNewsScore(item: NewsLike) {
  const contentLength = (item.content || '').trim().length;
  const summaryLength = (item.summary || '').trim().length;

  return (
    (item.blogPost ? 100_000 : 0) +
    (item.imageUrl ? 5_000 : 0) +
    Math.min(contentLength, 20_000) +
    Math.min(summaryLength, 2_000)
  );
}

function pickPreferredItem<T extends NewsLike>(current: T, candidate: T) {
  const currentScore = getNewsScore(current);
  const candidateScore = getNewsScore(candidate);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  const currentUpdated = toMillis(current.updatedAt);
  const candidateUpdated = toMillis(candidate.updatedAt);
  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }

  const currentCreated = toMillis(current.createdAt);
  const candidateCreated = toMillis(candidate.createdAt);
  if (candidateCreated && currentCreated) {
    return candidateCreated < currentCreated ? candidate : current;
  }

  return current;
}

export function dedupeNewsItems<T extends NewsLike>(items: T[], limit?: number) {
  const orderedKeys: string[] = [];
  const byKey = new Map<string, T>();

  for (const item of items) {
    const key = getNewsDeduplicationKey(item);
    if (!byKey.has(key)) {
      byKey.set(key, item);
      orderedKeys.push(key);
      continue;
    }

    const current = byKey.get(key);
    if (!current) continue;
    byKey.set(key, pickPreferredItem(current, item));
  }

  const deduped = orderedKeys.map((key) => byKey.get(key)).filter(Boolean) as T[];
  return typeof limit === 'number' ? deduped.slice(0, limit) : deduped;
}
