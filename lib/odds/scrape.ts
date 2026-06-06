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

// Acha a URL do próximo jogo de um time (tenta Série A, depois B).
async function acharJogoDoTime(
  termo: string,
  signal: AbortSignal,
): Promise<{ url: string; mandante: string; visitante: string; serie: 'A' | 'B' } | null> {
  const alvo = termo.toLowerCase();
  for (const comp of COMPETICOES) {
    const html = await fetchHtml(`${ACADEMIA}/stats/competition/brasil/${comp.id}`, signal);
    if (!html) continue;
    const re = new RegExp(
      `/stats/match/brasil/${comp.slug}/([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9]+)(?![a-z0-9])`,
      'gi',
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const [, t1, t2, id] = m;
      if (t1.includes(alvo) || t2.includes(alvo)) {
        return {
          url: `${ACADEMIA}/stats/match/brasil/${comp.slug}/${t1}/${t2}/${id}`,
          mandante: titulizar(t1),
          visitante: titulizar(t2),
          serie: comp.serie,
        };
      }
    }
  }
  return null;
}

/** Odds 1x2 do próximo jogo do time (default: Corinthians). Cacheado 30min; force ignora o cache. */
export async function getOddsProximoJogo(time = 'corinthians', force = false): Promise<OddsJogo | null> {
  const key = `odds:${time}`;
  const cached = cache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const jogo = await acharJogoDoTime(time, controller.signal);
    if (!jogo) {
      cache.set(key, { value: null, expiresAt: Date.now() + ODDS_TTL_MS });
      return null;
    }
    const html = await fetchHtml(`${jogo.url}/odds`, controller.signal);
    const parsed = html ? parseOdds1x2(html) : { casa: null, empate: null, fora: null, bookie: null };
    const value: OddsJogo = {
      mandante: jogo.mandante,
      visitante: jogo.visitante,
      url: jogo.url,
      serie: jogo.serie,
      ...parsed,
      temOdds: !!(parsed.casa || parsed.empate || parsed.fora),
    };
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
