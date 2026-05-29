// Decodifica corpos HTTP (RSS/XML e HTML) respeitando o charset real da resposta.
//
// Problema que isto resolve: fontes de notícia brasileiras frequentemente servem
// conteúdo em ISO-8859-1 / Windows-1252 sem declarar charset no Content-Type. Ao
// ler o corpo com `res.text()`, o runtime assume UTF-8 e os acentos viram o
// caractere de substituição "�" (U+FFFD). Aqui pegamos os bytes crus e decodificamos
// com o charset correto.

const CHARSET_ALIASES: Record<string, string> = {
  'iso-8859-1': 'windows-1252',
  'iso8859-1': 'windows-1252',
  latin1: 'windows-1252',
  'latin-1': 'windows-1252',
  cp1252: 'windows-1252',
  'win-1252': 'windows-1252',
  windows1252: 'windows-1252',
  utf8: 'utf-8',
};

function normalizeCharset(raw?: string | null): string {
  if (!raw) return '';
  const c = raw.trim().toLowerCase().replace(/["']/g, '');
  return CHARSET_ALIASES[c] || c;
}

function charsetFromContentType(contentType?: string | null): string {
  if (!contentType) return '';
  const m = /charset\s*=\s*["']?([^"';\s]+)/i.exec(contentType);
  return m ? normalizeCharset(m[1]) : '';
}

function sniffCharset(buf: Buffer, kind: 'xml' | 'html'): string {
  // Lê o início como latin1 (1 byte = 1 char) só para localizar a declaração ASCII.
  const head = buf.subarray(0, 2048).toString('latin1');
  if (kind === 'xml') {
    const m = /<\?xml[^>]*?\bencoding\s*=\s*["']([^"']+)["']/i.exec(head);
    if (m) return normalizeCharset(m[1]);
  } else {
    const m1 = /<meta[^>]+charset\s*=\s*["']?([^"'>\s/;]+)/i.exec(head);
    if (m1) return normalizeCharset(m1[1]);
    const m2 = /<meta[^>]+content\s*=\s*["'][^"']*charset=([^"'>\s;]+)/i.exec(head);
    if (m2) return normalizeCharset(m2[1]);
  }
  return '';
}

function isValidUtf8(buf: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

function decodeWith(buf: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    // Charset desconhecido pelo runtime: cai para UTF-8 tolerante.
    return new TextDecoder('utf-8').decode(buf);
  }
}

/**
 * Decodifica o corpo de uma resposta (RSS/XML ou HTML) usando o charset correto.
 *
 * Ordem de decisão:
 *  1. charset declarado no header Content-Type tem prioridade;
 *  2. senão, sniff da declaração embutida (`<?xml encoding>` ou `<meta charset>`);
 *  3. se o charset resolvido for utf-8 (ou nenhum), valida UTF-8 estrito — se os
 *     bytes não forem UTF-8 válido, assume windows-1252 (caso clássico de fonte
 *     latin-1 sem declaração), que cobre todo o range 0x80–0xFF sem gerar "�".
 */
export function decodeHttpBody(
  buf: Buffer,
  contentType: string | null | undefined,
  kind: 'xml' | 'html'
): string {
  const declared = charsetFromContentType(contentType) || sniffCharset(buf, kind);

  if (declared && declared !== 'utf-8') {
    return decodeWith(buf, declared);
  }

  if (isValidUtf8(buf)) {
    return new TextDecoder('utf-8').decode(buf);
  }
  return decodeWith(buf, 'windows-1252');
}

/** Lê uma Response já decodificando com o charset correto (em vez de `res.text()`). */
export async function readBodyDecoded(res: Response, kind: 'xml' | 'html'): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeHttpBody(buf, res.headers.get('content-type'), kind);
}
