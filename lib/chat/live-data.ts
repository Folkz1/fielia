// Injeta "dados ao vivo" no contexto do chat a partir de fontes confiáveis.
//
// Hoje cobre o ELENCO ATUAL do Corinthians (via API da Wikipédia, que mantém a
// predefinição de elenco atualizada pela comunidade). Sem isso, o LLM responde o
// elenco de memória e alucina jogadores que já saíram (ex.: cita o Cássio).
//
// Design (revisado com o advisor):
// - Detecção de intenção conservadora por regex — falso positivo custaria latência/$$.
// - Wikipédia é estável e não bloqueia: fetch direto, sem proxy.
// - Cache em memória (Map) com TTL: o elenco muda em semanas, então reaquecer após
//   um restart é irrelevante.
// - A busca é paralelizada com o RAG no chamador (não soma latência).

type LiveIntent = 'elenco' | 'jogos' | 'odds' | null;

// Conservador de propósito: só dispara em pergunta clara sobre elenco/escalação.
const ELENCO_RE =
  /\b(elenco|escala[çc][aã]o|plantel|jogadores do (timão|corinthians|time)|quem (joga|tá|esta) no (time|timão|corinthians)|forma[çc][aã]o titular|titulares do)\b/i;

// Reservado para o slice 2 (web search). Mantido aqui só para a detecção de intenção.
const JOGOS_RE =
  /\b(pr[óo]ximo jogo|quando (joga|tem jogo)|[úu]ltimo jogo|que horas (joga|[ée] o jogo)|placar d[ao]|resultado d[ao] (jogo|partida)|classifica[çc][aã]o|tabela do brasileir|posi[çc][aã]o na tabela)\b/i;

// Odds/apostas — checado ANTES de JOGOS_RE (mais específico). Conservador de propósito.
const ODDS_RE =
  /\b(odds?|cota[çc][aã]o|cota[çc][õo]es|quanto (paga|t[áa] pagando|est[áa] pagando)|apostar?|aposta no|vale a pena apostar|pagando quanto|favorito pra ganhar)\b/i;

export function detectLiveIntent(message: string): LiveIntent {
  if (!message) return null;
  if (ELENCO_RE.test(message)) return 'elenco';
  if (ODDS_RE.test(message)) return 'odds';
  if (JOGOS_RE.test(message)) return 'jogos';
  return null;
}

// ---- cache simples em memória ----
const cache = new Map<string, { value: string; expiresAt: number }>();
function getCached(key: string): string | null {
  const e = cache.get(key);
  return e && e.expiresAt > Date.now() ? e.value : null;
}
function setCached(key: string, value: string, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const WIKI_ELENCO_URL =
  'https://pt.wikipedia.org/w/api.php?action=parse&page=Predefini%C3%A7%C3%A3o:Elenco_do_Sport_Club_Corinthians_Paulista&prop=text&format=json&formatversion=2';
const ELENCO_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca o elenco atual da Wikipédia (com cache). Retorna texto plano ou null. */
export async function fetchElencoAtual(): Promise<string | null> {
  const cached = getCached('elenco');
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(WIKI_ELENCO_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FielIA/1.0 (+https://fielchat.com)' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { parse?: { text?: string } };
    const text = htmlToText(json?.parse?.text || '');
    if (text.length < 200) return null;
    const value = text.slice(0, 1600);
    setCached('elenco', value, ELENCO_TTL_MS);
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const JOGOS_TTL_MS = 2 * 60 * 60 * 1000; // 2h — jogos/resultados mudam mais rápido que o elenco
function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Busca dados atuais (próximo jogo, último resultado, classificação) via web search
 * do OpenRouter (server tool, mecanismo Exa). Usa gpt-4o-mini de propósito —
 * independente do modelo de conversa escolhido pelo cliente, que pode não suportar tools.
 * Cacheado por pergunta normalizada (TTL 2h) para conter custo (~US$0,011/busca).
 */
async function fetchJogosWebSearch(userMessage: string): Promise<string | null> {
  const cacheKey = 'jogos:' + normalizeKey(userMessage);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Hoje é ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}. Seus dados internos de treino estão DESATUALIZADOS — você é OBRIGADO a usar a ferramenta de busca web e NÃO responder de memória. Pesquise sobre o Sport Club Corinthians Paulista (futebol) e responda objetivamente, só os fatos, à pergunta: "${userMessage}". Inclua data, horário, adversário, competição e placar quando fizer sentido. Se não achar nada, diga que não encontrou.`,
        }],
        tools: [{ type: 'openrouter:web_search' }],
        max_tokens: 450,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content || content.length < 30) return null;
    setCached(cacheKey, content, JOGOS_TTL_MS);
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retorna um bloco de contexto "ao vivo" para a mensagem, ou null se não se aplica.
 * O formato segue o padrão do RAG ([RÓTULO] conteúdo) para concatenar no contexto.
 */
export async function getLiveContext(message: string): Promise<string | null> {
  const intent = detectLiveIntent(message);
  if (intent === 'elenco') {
    const elenco = await fetchElencoAtual();
    if (elenco) {
      return `[ELENCO ATUAL DO CORINTHIANS — fonte: Wikipédia, use estes nomes e descarte qualquer elenco antigo da sua memória]\n${elenco}`;
    }
  }
  if (intent === 'odds') {
    // dynamic import: só carrega o scraper (e o proxy) quando a pergunta é sobre odds
    const { getOddsContext } = await import('@/lib/odds/scrape');
    const odds = await getOddsContext();
    if (odds) return odds;
  }
  if (intent === 'jogos') {
    const jogos = await fetchJogosWebSearch(message);
    if (jogos) {
      return `[JOGOS E RESULTADOS RECENTES DO CORINTHIANS — fonte: busca web atualizada, use estes dados como verdade]\n${jogos}`;
    }
  }
  return null;
}
