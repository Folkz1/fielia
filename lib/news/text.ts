export function stripHtmlToText(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Sanitiza HTML mantendo tags seguras (links, negrito, italico)
 * e converte URLs em texto puro para links clicaveis
 */
export function sanitizeHtml(input: string): string {
  let html = input
    // Remover scripts e styles
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    // Remover event handlers (onclick, onerror, etc)
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*\S+/gi, '');

  // Permitir apenas tags seguras: a, strong, b, em, i, br, p
  const allowedTags = ['a', 'strong', 'b', 'em', 'i', 'br', 'p', 'ul', 'ol', 'li', 'h2', 'h3', 'h4'];
  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const lower = tag.toLowerCase();
    if (!allowedTags.includes(lower)) return ' ';
    // Para links, manter href mas adicionar target/rel
    if (lower === 'a') {
      const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
      if (hrefMatch) {
        return `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer" class="text-yellow-500 hover:text-yellow-400 underline underline-offset-2">`;
      }
      return '<a>';
    }
    // Manter tag como está
    return match.startsWith('</') ? `</${lower}>` : `<${lower}>`;
  });

  // Converter URLs em texto puro para links clicaveis
  html = html.replace(
    /(?<![="'])https?:\/\/[^\s<>"']+/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-yellow-500 hover:text-yellow-400 underline underline-offset-2">${url}</a>`
  );

  // Decodificar entidades HTML comuns
  html = html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]{2,}/g, ' ');

  return html.trim();
}

/**
 * Sanitiza HTML e divide em paragrafos
 * Retorna HTML seguro para dangerouslySetInnerHTML
 */
export function sanitizeAndSplit(input: string): string[] {
  const html = sanitizeHtml(input);
  // Converter <br> e </p> em separadores
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '');
  return withBreaks
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function splitParagraphs(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
}
