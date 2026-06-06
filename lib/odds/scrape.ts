// Odds 1x2 do próximo jogo do Corinthians via Academia das Apostas (academiadasapostas.com).
//
// Por que essa fonte (decisão validada em docs/operations/odds-monitor-feasibility-2026-06-05.md):
// - O oddspedia serve odds só via API protegida por Cloudflare (JS challenge) — bloqueia
//   fetch+proxy de datacenter/proxy residencial comercial. Testado: 0/12 IPs passaram.
// - A Academia é nginx server-side: as odds vêm no HTML e passam por fetch+proxy, igual ao
//   scraper de notícias (lib/news/scrape.ts). Sem browser headless, sem Chromium no container.
//
// Limitações conhecidas (honestas):
// - A página de jogo destaca 1 casa (bet365). Comparação multi-casa ("melhor odd entre casas")
//   é a v2 e exige uma API de odds — ver o doc.
// - Odds só abrem poucos dias antes do jogo; antes disso temOdds=false (não inventar valores).

import { getProxyDispatcher, hasProxyConfigured } from '@/lib/proxy';

const ACADEMIA = 'https://www.academiadasapostas.com';
// Competições brasileiras na Academia (ids validados). Tenta A primeiro, depois B —
// permite o monitor mostrar odds reais mesmo com a Série A em pausa (consultar time da B).
const COMPETICOES = [
  { id: 26, serie: 'A' as const, slug: 'serie-a' },
  { id: 89, serie: 'B' as const, slug: 'serie-b' },
];
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

const ODDS_TTL_MS = 30 * 60 * 1000; // 30min — odds pré-jogo mudam devagar

export interface OddsJogo {
  mandante: string;
  visitante: string;
  url: string;
  serie: 'A' | 'B' | null; // competição onde o jogo foi encontrado
  bookie: string | null; // casa de aposta (ex.: bet365)
  casa: string | null; // odd vitória do mandante
  empate: string | null;
  fora: string | null; // odd vitória do visitante
  temOdds: boolean; // false quando o mercado ainda não abriu
}

// ---- cache simples em memória (mesmo padrão de lib/chat/live-data.ts) ----
const cache = new Map<string, { value: OddsJogo | null; expiresAt: number }>();

// fetch direto + fallback proxy residencial — mesmo padrão de lib/news/scrape.ts
async function fetchHtml(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal, headers: HEADERS });
    if (res.ok) return await res.text();
  } catch {
    // cai para o proxy abaixo
  }
  if (hasProxyConfigured()) {
    try {
      const dispatcher = await getProxyDispatcher();
      if (dispatcher) {
        const proxyFetch = globalThis.fetch as (u: string, init?: Record<string, unknown>) => Promise<Response>;
        const res = await proxyFetch(url, { redirect: 'follow', signal, headers: HEADERS, dispatcher });
        if (res.ok) return await res.text();
      }
    } catch {
      // desiste silenciosamente — o chamador trata o null
    }
  }
  return null;
}

function titulizar(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Extrai odds 1x2 do bloco <div class="bookmaker-odds"> da página de jogo.
// Markup validado: <div class="odd"> <a href=".../redirect/<casa>/...">VALOR</a> <p>MERCADO</p>
function parseOdds1x2(html: string): Pick<OddsJogo, 'casa' | 'empate' | 'fora' | 'bookie'> {
  const re =
    /<div class="odd">\s*<a[^>]*href="[^"]*\/redirect\/([a-z0-9]+)\/[^"]*"[^>]*>\s*([\d.]+)\s*<\/a>\s*<p>([^<]+)<\/p>/gi;
  const out = {
    casa: null as string | null,
    empate: null as string | null,
    fora: null as string | null,
    bookie: null as string | null,
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const bookie = m[1];
    const valor = m[2];
    const mercado = m[3].trim().toLowerCase();
    if (/casa|home/.test(mercado) && out.casa === null) {
      out.casa = valor;
      out.bookie = bookie;
    } else if (/(^x$|empate|draw)/.test(mercado) && out.empate === null) {
      out.empate = valor;
    } else if (/fora|away/.test(mercado) && out.fora === null) {
      out.fora = valor;
    }
  }
  return out;
}

type JogoRef = { url: string; mandante: string; visitante: string; serie: 'A' | 'B' };

// Lista os jogos de um time (tenta Série A; se não achar, Série B). Sem buscar odds ainda.
async function listarJogosDoTime(termo: string, signal: AbortSignal): Promise<JogoRef[]> {
  const alvo = termo.toLowerCase();
  for (const comp of COMPETICOES) {
    const html = await fetchHtml(`${ACADEMIA}/stats/competition/brasil/${comp.id}`, signal);
    if (!html) continue;
    const re = new RegExp(
      `/stats/match/brasil/${comp.slug}/([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9]+)(?![a-z0-9])`,
      'gi',
    );
    const jogos: JogoRef[] = [];
    const vistos = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const [, t1, t2, id] = m;
      if ((t1.includes(alvo) || t2.includes(alvo)) && !vistos.has(id)) {
        vistos.add(id);
        jogos.push({
          url: `${ACADEMIA}/stats/match/brasil/${comp.slug}/${t1}/${t2}/${id}`,
          mandante: titulizar(t1),
          visitante: titulizar(t2),
          serie: comp.serie,
        });
      }
    }
    if (jogos.length) return jogos; // achou nessa série, não precisa procurar na outra
  }
  return [];
}

/**
 * Probabilidade implícita normalizada (em %) a partir das odds 1x2.
 * prob_i = (1/odd_i) / Σ(1/odd_j) — o Σ remove a margem da casa (overround), então as 3 somam 100%.
 * Retorna null se faltar alguma odd.
 */
export function probabilidadesImplicitas(
  j: Pick<OddsJogo, 'casa' | 'empate' | 'fora'>,
): { casa: number; empate: number; fora: number } | null {
  const c = parseFloat(j.casa || '');
  const e = parseFloat(j.empate || '');
  const f = parseFloat(j.fora || '');
  if (!c || !e || !f) return null;
  const ic = 1 / c, ie = 1 / e, iff = 1 / f;
  const soma = ic + ie + iff;
  return {
    casa: Math.round((ic / soma) * 100),
    empate: Math.round((ie / soma) * 100),
    fora: Math.round((iff / soma) * 100),
  };
}

/** Odds 1x2 do próximo jogo do time (default: Corinthians). Cacheado 30min; force ignora o cache. */
export async function getOddsProximoJogo(time = 'corinthians', force = false): Promise<OddsJogo | null> {
  const key = `odds:${time}`;
  const cached = cache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const jogos = await listarJogosDoTime(time, controller.signal);
    if (!jogos.length) {
      cache.set(key, { value: null, expiresAt: Date.now() + ODDS_TTL_MS });
      return null;
    }
    // Busca odds dos primeiros jogos do time EM PARALELO e fica com o 1º que tem mercado aberto.
    // (Antes pegava só o 1º jogo da lista — que muitas vezes não tem odds. Este é o fix.)
    const candidatos = jogos.slice(0, 5);
    const avaliados = await Promise.all(
      candidatos.map(async (jogo): Promise<OddsJogo> => {
        const html = await fetchHtml(`${jogo.url}/odds`, controller.signal);
        const parsed = html ? parseOdds1x2(html) : { casa: null, empate: null, fora: null, bookie: null };
        return { ...jogo, ...parsed, temOdds: !!(parsed.casa || parsed.empate || parsed.fora) };
      }),
    );
    const value = avaliados.find((j) => j.temOdds) || avaliados[0] || null;
    cache.set(key, { value, expiresAt: Date.now() + ODDS_TTL_MS });
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Bloco de contexto "ao vivo" para o chat (padrão [RÓTULO] do RAG/live-data).
 * Inclui disclaimer de jogo responsável e proíbe o LLM de inventar valores.
 */
export async function getOddsContext(time = 'corinthians'): Promise<string | null> {
  const j = await getOddsProximoJogo(time);
  if (!j) return null;
  if (!j.temOdds) {
    return `[ODDS — o próximo jogo é ${j.mandante} x ${j.visitante}, mas as casas ainda NÃO abriram odds para esta partida (o mercado abre poucos dias antes do jogo). Diga isso ao torcedor e NÃO invente valores.]`;
  }
  return [
    `[ODDS DO PRÓXIMO JOGO DO CORINTHIANS — fonte: Academia das Apostas (casa ${j.bookie ?? 'n/d'}). Use SOMENTE estes valores, não invente. Apostar é +18: sempre lembre o torcedor de apostar com responsabilidade.]`,
    `${j.mandante} x ${j.visitante}`,
    `Vitória ${j.mandante}: ${j.casa ?? '-'} | Empate: ${j.empate ?? '-'} | Vitória ${j.visitante}: ${j.fora ?? '-'}`,
  ].join('\n');
}

// ---- Painel "jogos do dia" (multi-liga) ----
export interface JogoDoDia {
  liga: string;
  mandante: string;
  visitante: string;
  url: string;
  bookie: string | null;
  casa: string | null;
  empate: string | null;
  fora: string | null;
  probabilidades: { casa: number; empate: number; fora: number } | null;
}
export interface LigaJogos {
  liga: string;
  jogos: JogoDoDia[];
}

// Ligas acompanhadas (id + slug da competição na Academia, validados). prio = ordem de exibição.
// O slug filtra os jogos da competição (as listagens linkam jogos de outras competições como ruído).
const LIGAS_ALVO: Array<{ pais: string; id: number; slug: string; nome: string; prio: number }> = [
  { pais: 'brasil', id: 26, slug: 'serie-a', nome: 'Brasileirão Série A', prio: 1 },
  { pais: 'brasil', id: 89, slug: 'serie-b', nome: 'Brasileirão Série B', prio: 2 },
  { pais: 'america-do-sul', id: 241, slug: 'conmebol-libertadores', nome: 'Libertadores', prio: 3 },
  { pais: 'america-do-sul', id: 288, slug: 'copa-america', nome: 'Copa América', prio: 4 },
  { pais: 'mundo', id: 72, slug: 'mundial', nome: 'Copa do Mundo / Mundial', prio: 5 },
  { pais: 'mundo', id: 430, slug: 'amigaveis', nome: 'Amistosos / Seleções', prio: 6 },
  { pais: 'inglaterra', id: 8, slug: 'premier-league', nome: 'Premier League', prio: 7 },
  { pais: 'italia', id: 13, slug: 'serie-a', nome: 'Serie A (Itália)', prio: 8 },
  { pais: 'alemanha', id: 9, slug: 'bundesliga', nome: 'Bundesliga', prio: 9 },
  { pais: 'franca', id: 16, slug: 'ligue-1', nome: 'Ligue 1', prio: 10 },
];

const jogosCache = new Map<string, { value: LigaJogos[]; expiresAt: number }>();
const JOGOS_POR_LIGA = 6; // candidatos por liga (busca odds; fica com os que têm mercado)
const MAX_JOGOS = 60; // teto total de fetches de odds por ciclo (≈ todas as ligas × JOGOS_POR_LIGA)

/**
 * Próximos jogos COM odds (bet365) das ligas acompanhadas, agrupados por liga. Cache 30min.
 * Usa as listagens das competições (têm os jogos futuros com mercado aberto) — NÃO o /livescores,
 * que traz jogos ao vivo/encerrados sem odds pré-jogo.
 */
export async function getJogosDoDia(force = false, cacheOnly = false): Promise<LigaJogos[]> {
  const cached = jogosCache.get('all');
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;
  // cacheOnly: usado no caminho do chat — nunca dispara o scrape pesado (o cron mantém quente)
  if (cacheOnly) return cached?.value ?? [];

  try {
    // 1) candidatos: primeiros jogos de cada liga (listagens em paralelo)
    const listas = await Promise.all(
      LIGAS_ALVO.map(async (liga) => {
        let html: string | null = null;
        try {
          html = await fetchHtml(`${ACADEMIA}/stats/competition/${liga.pais}/${liga.id}`, AbortSignal.timeout(10000));
        } catch {
          /* liga indisponível — ignora */
        }
        if (!html) return [];
        const re = new RegExp(
          `/stats/match/${liga.pais}/${liga.slug}/([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9]+)(?![a-z0-9])`,
          'gi',
        );
        const vistos = new Set<string>();
        const out: Array<{ liga: (typeof LIGAS_ALVO)[number]; url: string; mandante: string; visitante: string }> = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null && out.length < JOGOS_POR_LIGA) {
          const [, t1, t2, id] = m;
          if (vistos.has(id)) continue;
          vistos.add(id);
          out.push({
            liga,
            url: `${ACADEMIA}/stats/match/${liga.pais}/${liga.slug}/${t1}/${t2}/${id}`,
            mandante: titulizar(t1),
            visitante: titulizar(t2),
          });
        }
        return out;
      }),
    );
    const candidatos = listas.flat().slice(0, MAX_JOGOS);

    // 2) odds de cada candidato (paralelo, timeout por fetch). Mantém só os com mercado aberto.
    const avaliados = await Promise.all(
      candidatos.map(async (c) => {
        let p = { casa: null as string | null, empate: null as string | null, fora: null as string | null, bookie: null as string | null };
        try {
          const oh = await fetchHtml(`${c.url}/odds`, AbortSignal.timeout(8000));
          if (oh) p = parseOdds1x2(oh);
        } catch {
          /* jogo individual falhou */
        }
        return { liga: c.liga, mandante: c.mandante, visitante: c.visitante, url: c.url, ...p };
      }),
    );
    const comOdds = avaliados.filter((j) => j.casa || j.empate || j.fora);

    // 3) agrupa por liga (ordem = prio), com probabilidades
    const result: LigaJogos[] = [];
    for (const liga of LIGAS_ALVO) {
      const jogos = comOdds
        .filter((j) => j.liga.nome === liga.nome)
        .map((j): JogoDoDia => ({
          liga: liga.nome,
          mandante: j.mandante,
          visitante: j.visitante,
          url: j.url,
          bookie: j.bookie,
          casa: j.casa,
          empate: j.empate,
          fora: j.fora,
          probabilidades: probabilidadesImplicitas(j),
        }));
      if (jogos.length) result.push({ liga: liga.nome, jogos });
    }

    jogosCache.set('all', { value: result, expiresAt: Date.now() + ODDS_TTL_MS });
    return result;
  } catch {
    return cached?.value ?? [];
  }
}

/**
 * Contexto de "jogos do dia + odds" para o chat (grupo WhatsApp + plataforma web).
 * Lê SOMENTE do cache (cacheOnly) — nunca dispara o scrape pesado no caminho da resposta.
 * O cron (lib/scheduler.ts) mantém o cache quente em produção.
 */
export async function getJogosDoDiaContext(): Promise<string | null> {
  const ligas = await getJogosDoDia(false, true);
  if (!ligas.length) return null;
  const fmt = (odd: string | null, pr?: number) => `${odd ?? '-'}${pr != null ? ` (${pr}%)` : ''}`;
  const linhas: string[] = [];
  for (const l of ligas) {
    linhas.push(`${l.liga}:`);
    for (const j of l.jogos.slice(0, 6)) {
      const p = j.probabilidades ?? undefined;
      linhas.push(
        `  ${j.mandante} x ${j.visitante} — ${j.mandante}: ${fmt(j.casa, p?.casa)} | Empate: ${fmt(j.empate, p?.empate)} | ${j.visitante}: ${fmt(j.fora, p?.fora)}`,
      );
    }
  }
  return [
    `[JOGOS DO DIA + ODDS — fonte: Academia das Apostas (bet365). Use SOMENTE estes dados, não invente valores. % = probabilidade implícita. Apostar é +18: lembre o torcedor de jogar com responsabilidade.]`,
    ...linhas,
  ].join('\n');
}
