import { NextRequest, NextResponse } from 'next/server';
import { getProxyDispatcher, hasProxyConfigured } from '@/lib/proxy';
import { getOddsProximoJogo } from '@/lib/odds/scrape';

// TEMPORÁRIO (Deploy 1) — valida o scraper DE DENTRO da produção: o datacenter alcança a
// Academia direto? via proxy? o scraper traz odds? Protegido por token na query. REMOVER no Deploy 2.
const DIAG_TOKEN = 'odds-diag-9k3x7m2q';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' };
const ALVO = 'https://www.academiadasapostas.com/stats/competition/brasil/89';
const proxyFetch = globalThis.fetch as (u: string, init?: Record<string, unknown>) => Promise<Response>;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get('t') !== DIAG_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const time = (url.searchParams.get('time') || 'corinthians').toLowerCase().slice(0, 40);

  // 1) fetch direto (IP do datacenter)
  let direto: Record<string, unknown> = {};
  try {
    const r = await fetch(ALVO, { headers: H });
    direto = { status: r.status, ok: r.ok };
  } catch (e) {
    direto = { error: String(e).slice(0, 120) };
  }

  // 2) fetch via proxy residencial Webshare
  let viaProxy: Record<string, unknown> = { configured: hasProxyConfigured() };
  try {
    const d = await getProxyDispatcher();
    if (d) {
      const r = await proxyFetch(ALVO, { headers: H, dispatcher: d });
      viaProxy = { ...viaProxy, status: r.status, ok: r.ok };
    }
  } catch (e) {
    viaProxy = { ...viaProxy, error: String(e).slice(0, 120) };
  }

  // 3) scraper real (ignora cache)
  let jogo = null;
  let scrapeErr: string | null = null;
  try {
    jogo = await getOddsProximoJogo(time, true);
  } catch (e) {
    scrapeErr = String(e).slice(0, 120);
  }

  return NextResponse.json({
    time,
    env: process.env.NODE_ENV,
    fetchDireto: direto,
    fetchViaProxy: viaProxy,
    scraper: { jogo, erro: scrapeErr },
    fetchedAt: new Date().toISOString(),
  });
}
