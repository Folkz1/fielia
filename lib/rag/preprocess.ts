/**
 * Pre-processamento de texto para RAG
 * Limpeza, normalizacao e filtro de qualidade antes do chunking
 */

/**
 * Remove HTML tags e decodifica entidades
 */
function stripHtml(text: string): string {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/**
 * Remove URLs longas (>80 chars) substituindo por [link]
 */
function simplifyUrls(text: string): string {
  return text.replace(/https?:\/\/\S{80,}/g, "[link]");
}

/**
 * Normaliza unicode (NFD -> NFC) e remove caracteres de controle
 */
function normalizeUnicode(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Limpa espacos excessivos mantendo paragrafos
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Pipeline completo de limpeza de texto para RAG
 */
export function cleanTextForRAG(text: string): string {
  let cleaned = text;
  cleaned = stripHtml(cleaned);
  cleaned = simplifyUrls(cleaned);
  cleaned = normalizeUnicode(cleaned);
  cleaned = normalizeWhitespace(cleaned);
  return cleaned;
}

/**
 * Verifica se chunk tem qualidade minima para ingestao
 * Rejeita chunks muito curtos ou com muito lixo
 */
export function isQualityChunk(chunk: string): boolean {
  const trimmed = chunk.trim();

  // Muito curto
  if (trimmed.length < 50) return false;

  // Muitos caracteres especiais (>40% do texto)
  const specialCount = (trimmed.match(/[^a-zA-Z0-9\u00C0-\u024F\s.,;:!?'"()\-]/g) || []).length;
  if (specialCount / trimmed.length > 0.4) return false;

  // Pouco texto alfanumerico (menos de 30%)
  const alphaCount = (trimmed.match(/[a-zA-Z0-9\u00C0-\u024F]/g) || []).length;
  if (alphaCount / trimmed.length < 0.3) return false;

  return true;
}

/**
 * Chunking inteligente que prefere quebrar em fim de frase
 */
export function smartChunk(text: string, chunkSize: number = 600, overlap: number = 80): string[] {
  const normalized = normalizeWhitespace(text);

  // Dividir por secoes markdown primeiro
  const sections = normalized
    .replace(/(\s)#\s+/g, "\n# ")
    .replace(/^#\s+/gm, "## ")
    .replace(/[ \t]*##\s+/g, "\n## ")
    .trim()
    .split(/\n(?=##\s+)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push(section);
      continue;
    }

    // Dividir secao grande preferindo fim de frase
    let start = 0;
    while (start < section.length) {
      const end = Math.min(start + chunkSize, section.length);

      if (end === section.length) {
        const chunk = section.slice(start).trim();
        if (chunk) chunks.push(chunk);
        break;
      }

      // Procurar fim de frase proximo ao limite do chunk
      let breakPoint = end;
      const searchStart = Math.max(start + Math.floor(chunkSize * 0.7), start);
      const searchRegion = section.slice(searchStart, end);

      // Procurar ultimo ponto final, ! ou ? seguido de espaco
      const sentenceEnd = searchRegion.search(/[.!?]\s[A-Z\u00C0-\u00DC]/);
      if (sentenceEnd !== -1) {
        breakPoint = searchStart + sentenceEnd + 2; // incluir o ponto e espaco
      } else {
        // Fallback: quebrar em virgula ou espaco
        const lastComma = searchRegion.lastIndexOf(", ");
        if (lastComma !== -1) {
          breakPoint = searchStart + lastComma + 2;
        } else {
          const lastSpace = searchRegion.lastIndexOf(" ");
          if (lastSpace !== -1) {
            breakPoint = searchStart + lastSpace + 1;
          }
        }
      }

      const chunk = section.slice(start, breakPoint).trim();
      if (chunk) chunks.push(chunk);

      start = breakPoint - overlap;
      if (start < 0) start = 0;
    }
  }

  return chunks.filter(Boolean);
}

/**
 * Gera hash simples para deduplicacao
 */
export function simpleHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}
