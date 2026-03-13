import { sendChatCompletion } from '@/lib/openrouter';

type RewriteNewsInput = {
  title: string;
  category: string;
  sourceText: string;
};

type RewriteNewsPayload = {
  title?: string;
  summary?: string;
  content?: string;
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  const cleaned = value.trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

function stripUrls(value: string) {
  return value.replace(/https?:\/\/\S+/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function extractJsonFromText(text: string): RewriteNewsPayload | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0] || text;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') return parsed as RewriteNewsPayload;
    return null;
  } catch {
    return null;
  }
}

export async function rewriteNewsWithAI(input: RewriteNewsInput) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const tone = process.env.NEWS_REWRITE_TONE || 'informativo e envolvente';
  const targetAudience = process.env.NEWS_REWRITE_TARGET_AUDIENCE || 'torcedores do Corinthians';

  const system = [
    'Você é jornalista esportivo da redação FIEL.IA, especializado em Corinthians.',
    'Escreva uma MATÉRIA ORIGINAL com base nos fatos fornecidos.',
    'O texto deve parecer que foi escrito por um editor próprio da FIEL.IA — NUNCA mencione fonte, site, portal, autor externo ou de onde veio a informação.',
    'PROIBIDO: "segundo", "de acordo com", "conforme", "fonte", "portal", "site", nomes de veículos de imprensa, URLs.',
    'Não invente fatos, números, declarações, datas ou nomes — use apenas o que está nos fatos fornecidos.',
    'Escreva em português brasileiro com acentuação correta (ç, ã, é, ô, etc).',
    'Parágrafos curtos, linguagem direta e envolvente para torcedores.',
    `Tom editorial: ${tone}.`,
    `Público-alvo: ${targetAudience}.`,
    'Retorne APENAS JSON válido no formato:',
    '{"title":"","summary":"","content":""}',
    'title: manchete original e impactante (máximo 140 chars).',
    'summary: 1 a 2 frases (máximo 220 caracteres).',
    'content: matéria completa com múltiplos parágrafos, sem Markdown e sem listas.',
  ].join('\n');

  const user = [
    `Titulo atual: ${input.title}`,
    `Categoria: ${input.category}`,
    '',
    'TEXTO-FONTE (fatos):',
    truncate(compactWhitespace(input.sourceText), 7000),
  ].join('\n');

  const model = process.env.OPENROUTER_NEWS_MODEL || process.env.OPENROUTER_MODEL;
  const response = await sendChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.4, maxTokens: 1400, model }
  );

  const parsed = extractJsonFromText(response.content || '');
  const title = parsed?.title ? truncate(stripUrls(compactWhitespace(parsed.title)), 140) : '';
  const summary = parsed?.summary ? truncate(stripUrls(compactWhitespace(parsed.summary)), 220) : '';
  const contentRaw = parsed?.content ? stripUrls(parsed.content) : '';
  const content = contentRaw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!title || !summary || !content) {
    throw new Error('AI returned invalid payload (missing title, summary or content)');
  }

  return { title, summary, content, model: response.model, tokensUsed: response.tokensUsed };
}

