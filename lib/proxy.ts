// Helper de proxy residencial (Webshare) reutilizável para fetches que sofrem
// bloqueio por IP de datacenter (ex.: ge.globo bloqueia o scraper de notícias).
//
// Mesma lógica validada em lib/youtube/transcript.ts:
// - resolve o DNS pelo resolver do sistema (o hostname p.webshare.io falha DNS
//   dentro do container Alpine/musl; em produção a env aponta para o IP);
// - passa o token Basic explícito (undici ignora credenciais embutidas no URI — bug #1674).
import { ProxyAgent } from 'undici';
import { lookup } from 'node:dns/promises';

let cached: { agent: ProxyAgent; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000; // recria a cada 10min

/** Retorna um ProxyAgent residencial, ou null se as credenciais não estiverem configuradas. */
export async function getProxyDispatcher(): Promise<ProxyAgent | null> {
  const host = process.env.WEBSHARE_PROXY_HOST;
  const user = process.env.WEBSHARE_PROXY_USER;
  const pass = process.env.WEBSHARE_PROXY_PASS;
  const port = process.env.WEBSHARE_PROXY_PORT || '80';
  if (!host || !user || !pass) return null;

  if (cached && Date.now() - cached.at < TTL_MS) return cached.agent;

  let resolvedHost = host;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    try {
      const r = await lookup(host);
      resolvedHost = r.address;
    } catch {
      resolvedHost = host; // deixa o ProxyAgent tentar resolver
    }
  }
  const token = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  const agent = new ProxyAgent({ uri: `http://${resolvedHost}:${port}`, token });
  cached = { agent, at: Date.now() };
  return agent;
}

/** True se há credenciais de proxy configuradas (sem criar o agente). */
export function hasProxyConfigured(): boolean {
  return Boolean(process.env.WEBSHARE_PROXY_HOST && process.env.WEBSHARE_PROXY_USER && process.env.WEBSHARE_PROXY_PASS);
}
