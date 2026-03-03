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
    'Voce e editor da FIEL.IA e escreve noticias originais para torcedores do Corinthians.',
    'Reescreva a noticia com SUAS palavras, sem copiar trechos longos literalmente do texto-fonte.',
    'Nao mencione a fonte, nao cite sites, nao inclua URLs e nao escreva "segundo" ou "de acordo com".',
    'Nao invente fatos, numeros, declaracoes, datas ou nomes que nao estejam no texto-fonte.',
    'Escreva em portugues brasileiro, com paragrafos curtos e claros.',
    `Tom editorial: ${tone}.`,
    `Publico-alvo: ${targetAudience}.`,
    'Retorne APENAS JSON valido no formato:',
    '{"title":"","summary":"","content":""}',
    'summary deve ter 1 a 2 frases (max 220 caracteres).',
    'content deve ter multiplos paragrafos, sem Markdown e sem listas com links.',
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

