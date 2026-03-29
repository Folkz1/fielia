function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  const cleaned = compactWhitespace(value);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

export function buildNewsFallbackFromSource(input: {
  currentTitle: string;
  currentSummary: string;
  sourceText: string;
  scrapedTitle?: string | null;
  scrapedExcerpt?: string | null;
}) {
  const sourceText = input.sourceText.trim();
  const excerpt = compactWhitespace(input.scrapedExcerpt || '');
  const firstParagraph = sourceText
    .split(/\n{2,}/)
    .map((part) => compactWhitespace(part))
    .find(Boolean);

  const summaryBase = excerpt || firstParagraph || input.currentSummary || input.currentTitle;

  return {
    title: compactWhitespace(input.currentTitle || input.scrapedTitle || 'Notícia do Corinthians'),
    summary: truncate(summaryBase, 220),
    content: sourceText,
  };
}
