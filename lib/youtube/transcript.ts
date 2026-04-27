/**
 * Servico de transcricao de videos do YouTube para RAG
 *
 * Usa youtube-transcript-plus com proxy residencial Webshare.
 * CRITICO: usar globalThis.fetch com undici ProxyAgent (dispatcher).
 * CRITICO: enviar cookie SOCS de consent em TODAS as requests (bypass consent wall).
 *
 * IMPORTANTE: em Alpine/Docker, undici npm fetch NAO resolve DNS (ENOTFOUND).
 * Usar globalThis.fetch (Node built-in) que resolve DNS corretamente.
 * globalThis.fetch aceita { dispatcher } porque e baseado em undici internamente.
 */

import { fetchTranscript } from "youtube-transcript-plus";
import { Innertube, Platform } from "youtubei.js";
import { ProxyAgent } from "undici";
import { lookup } from "node:dns/promises";
import { execFile } from "node:child_process";
import { readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestDocument, type IngestDocument } from "@/lib/rag/ingest";

// globalThis.fetch aceita { dispatcher } em Node 18+ (baseado em undici internamente)
// Cast para any porque os TS types nao incluem a opcao dispatcher
const proxyFetch = globalThis.fetch as (url: string | URL | Request, init?: any) => Promise<Response>;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_RETRIES = 3;

// Cookie de consent para bypass da consent wall do YouTube (obrigatorio com proxy)
const CONSENT_COOKIE = "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMjA4MDEuMDdfcDEYAiABGgJwdA";

/**
 * Cria undici ProxyAgent Webshare com session ID unico (sticky IP)
 */
// Fallback IPs para p.webshare.io (Alpine Docker nao resolve DNS deste dominio)
// Atualizado em 2026-04-26 via getaddrinfo('p.webshare.io')
// Atualizado em 2026-04-27 via getaddrinfo('p.webshare.io')
const WEBSHARE_FALLBACK_IPS = [
  "177.54.157.203", "193.19.205.35", "170.80.109.44", "177.54.147.109",
  "103.88.235.135", "193.19.205.25", "103.88.235.78", "45.250.252.25",
];

// Cache do IP resolvido do proxy
let resolvedProxyIp: string | null = null;
let resolvedProxyAt = 0;
const DNS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function resolveProxyHost(host: string): Promise<string> {
  // Se ja e um IP, retorna direto
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;

  const now = Date.now();
  if (resolvedProxyIp && (now - resolvedProxyAt) < DNS_CACHE_TTL) {
    return resolvedProxyIp;
  }
  try {
    const result = await lookup(host);
    resolvedProxyIp = result.address;
    resolvedProxyAt = now;
    console.log(`[YouTube] DNS resolved ${host} -> ${resolvedProxyIp}`);
    return resolvedProxyIp;
  } catch (e) {
    // DNS falhou (comum em Alpine Docker) - usar fallback IP
    const fallbackIp = WEBSHARE_FALLBACK_IPS[Math.floor(Math.random() * WEBSHARE_FALLBACK_IPS.length)];
    console.warn(`[YouTube] DNS failed for ${host}, using fallback IP: ${fallbackIp}`);
    resolvedProxyIp = fallbackIp;
    resolvedProxyAt = now;
    return fallbackIp;
  }
}

async function getProxyDispatcher(sessionId?: number): Promise<ProxyAgent> {
  const host = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
  const baseUser = process.env.WEBSHARE_PROXY_USER || "lumgcvpn-rotate";
  const pass = process.env.WEBSHARE_PROXY_PASS || "";
  const port = process.env.WEBSHARE_PROXY_PORT || "80";

  if (!pass) {
    console.warn("[YouTube] AVISO: WEBSHARE_PROXY_PASS vazio! Proxy nao vai autenticar.");
  }

  const proxyUser = sessionId
    ? baseUser.replace("rotate", String(sessionId))
    : baseUser;

  // Resolver DNS do proxy com Node built-in (funciona em Alpine/musl)
  // ProxyAgent do npm undici faz DNS interno que falha em Alpine
  const resolvedHost = await resolveProxyHost(host);
  const proxyUrl = `http://${proxyUser}:${pass}@${resolvedHost}:${port}`;
  console.log(`[YouTube] Proxy: ${proxyUser}@${resolvedHost}:${port} (pass=${pass ? "SET" : "EMPTY"})`);
  return new ProxyAgent(proxyUrl);
}

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}

export interface TranscriptResult {
  videoId: string;
  title: string;
  transcript: string;
  chunks: number;
  success: boolean;
  error?: string;
}

/**
 * Extrai video ID de uma URL do YouTube
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // ID direto
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extrai channel ID ou handle de uma URL do YouTube
 */
export function extractChannelInfo(url: string): { type: "id" | "handle" | "custom"; value: string } | null {
  const patterns: [RegExp, "id" | "handle" | "custom"][] = [
    [/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, "id"],
    [/youtube\.com\/@([a-zA-Z0-9_.-]+)/, "handle"],
    [/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/, "custom"],
    [/youtube\.com\/user\/([a-zA-Z0-9_.-]+)/, "custom"],
  ];

  for (const [pattern, type] of patterns) {
    const match = url.match(pattern);
    if (match) return { type, value: match[1] };
  }
  return null;
}

/**
 * Resolve handle/custom URL para channel ID (UC...) via page scraping
 */
async function resolveChannelId(channelUrl: string): Promise<string> {
  const channelInfo = extractChannelInfo(channelUrl);
  if (!channelInfo) {
    throw new Error("URL de canal invalida");
  }

  if (channelInfo.type === "id" && channelInfo.value.startsWith("UC")) {
    return channelInfo.value;
  }

  let pageUrl: string;
  if (channelInfo.type === "handle") {
    pageUrl = `https://www.youtube.com/@${channelInfo.value}`;
  } else {
    pageUrl = `https://www.youtube.com/c/${channelInfo.value}`;
  }

  const dispatcher = await getProxyDispatcher();
  const res = await proxyFetch(pageUrl, {
    dispatcher,
    headers: {
      "User-Agent": UA,
      "Cookie": CONSENT_COOKIE,
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Canal nao encontrado (HTTP ${res.status}). Verifique se a URL esta correta.`);
  }

  const html = await res.text();
  const idPatterns = [
    /"browseId":"(UC[a-zA-Z0-9_-]+)"/,
    /"externalId":"(UC[a-zA-Z0-9_-]+)"/,
    /"channelId":"(UC[a-zA-Z0-9_-]+)"/,
  ];

  for (const p of idPatterns) {
    const match = html.match(p);
    if (match) return match[1];
  }

  throw new Error("Nao foi possivel resolver o channel ID. Tente usar a URL no formato youtube.com/channel/UC...");
}

/**
 * Lista videos recentes de um canal
 */
export async function getChannelVideos(channelUrl: string, limit: number = 10): Promise<VideoInfo[]> {
  const channelId = await resolveChannelId(channelUrl);

  const dispatcher = await getProxyDispatcher();
  const yt = await Innertube.create({
    fetch(input: any, init?: any) {
      const h = new Headers(init?.headers || {});
      h.set("Cookie", CONSENT_COOKIE);
      return Platform.shim.fetch(input, { ...init, headers: h, dispatcher });
    }
  });
  const channel = await yt.getChannel(channelId);

  const videos = await channel.getVideos();
  const results: VideoInfo[] = [];

  for (const video of videos.videos.slice(0, limit)) {
    if ('id' in video && 'title' in video) {
      results.push({
        id: String(video.id),
        title: String(video.title),
        description: 'description' in video ? String(video.description || "") : undefined,
        duration: 'duration' in video && video.duration ? (typeof video.duration === 'object' && 'text' in (video.duration as Record<string, unknown>) ? String((video.duration as Record<string, unknown>).text) : String(video.duration)) : undefined,
        thumbnailUrl: 'thumbnails' in video && Array.isArray(video.thumbnails) && video.thumbnails.length > 0
          ? String(video.thumbnails[0].url)
          : undefined,
      });
    }
  }

  return results;
}

/**
 * Busca legendas usando yt-dlp (requer instalacao no container: /usr/local/bin/yt-dlp).
 * Metodo mais confiavel: usa Android VR Player API do YouTube, bypassa bot detection.
 * Funciona para legendas ASR (auto-geradas) que nao aparecem no HTML da pagina.
 */
async function fetchTranscriptViaYtDlp(videoId: string): Promise<string | null> {
  try {
    const ytDlpBin = process.env.YTDLP_PATH || "yt-dlp";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const tmpBase = await mkdtemp(join(tmpdir(), `yt-${videoId}-`));
    const outBase = join(tmpBase, videoId);

    // Construir args de proxy (usado como fallback)
    const proxyHost = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
    const proxyUser = process.env.WEBSHARE_PROXY_USER || "";
    const proxyPass = process.env.WEBSHARE_PROXY_PASS || "";
    const proxyPort = process.env.WEBSHARE_PROXY_PORT || "80";
    const proxyArgs: string[] = proxyUser && proxyPass
      ? ["--proxy", `http://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`]
      : [];

    // Tentar: sem proxy (Android API burla bot detection), depois com proxy
    const attempts: Array<{ label: string; extraArgs: string[] }> = [
      { label: "direto", extraArgs: [] },
      { label: "proxy", extraArgs: proxyArgs },
    ];

    for (const attempt of attempts) {
      // Tentar pt primeiro, depois en
      for (const lang of ["pt", "en"]) {
        const jsonFile = `${outBase}.${lang}.json3`;
        await new Promise<void>((resolve) => {
          const args = [
            ...attempt.extraArgs,
            "--write-auto-sub", "--sub-lang", lang,
            "--sub-format", "json3",
            "--skip-download", "--no-warnings", "--ignore-errors",
            url, "-o", outBase,
          ];
          console.log(`[YouTube] yt-dlp ${attempt.label} lang=${lang}`);
          execFile(ytDlpBin, args, { timeout: 45_000 }, (err, _stdout, stderr) => {
            if (err) console.log(`[YouTube] yt-dlp err: ${err.message?.substring(0, 80)}`);
            if (stderr?.trim()) console.log(`[YouTube] yt-dlp stderr: ${stderr.substring(0, 150)}`);
            resolve();
          });
        });

      try {
        const raw = await readFile(jsonFile, "utf-8");
        const data = JSON.parse(raw) as { events?: Array<{ segs?: Array<{ utf8: string }> }> };
        const text = (data.events || [])
          .filter((e) => e.segs)
          .flatMap((e) => (e.segs || []).map((s) => (s.utf8 || "").replace(/\n/g, " ")))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        await unlink(jsonFile).catch(() => {});
        if (text.length > 50) {
          console.log(`[YouTube] yt-dlp OK lang=${lang} (${text.length} chars)`);
          return text;
        }
      } catch {
        // proximo idioma
      }
    }
    // Nenhum idioma funcionou nesta tentativa — continuar para proxima
  }
  return null;
  } catch (err) {
    console.log(`[YouTube] yt-dlp erro: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Busca legendas diretamente do HTML da pagina do YouTube.
 * Usa proxy Webshare + CONSENT_COOKIE para obter pagina completa com captionTracks.
 * Diagrama confirma: proxyFetch+dispatcher retorna HTML 1.1MB com hasCaptions:true.
 *
 * Fluxo: fetch pagina via proxy → extrai captionTracks JSON → fetch URL da legenda
 */
async function fetchTranscriptFromPage(videoId: string, dispatcher?: ProxyAgent): Promise<string | null> {
  try {
    const baseInit = dispatcher ? { dispatcher } : {};
    const pageRes = await proxyFetch(`https://www.youtube.com/watch?v=${videoId}`, {
      ...baseInit,
      headers: {
        "User-Agent": UA,
        "Cookie": CONSENT_COOKIE,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!pageRes.ok) {
      console.log(`[YouTube] pagina nao ok: ${pageRes.status}`);
      return null;
    }
    const html = await pageRes.text();

    // Extrair captionTracks do JSON embutido na pagina
    // Nota: usar [\s\S]*? em vez de .*? com flag /s (compatibilidade TypeScript)
    const captionMatch = html.match(/"captionTracks":(\[[\s\S]*?\]),"audioTracks"/)
      || html.match(/"captionTracks":(\[[\s\S]*?\]),"translationLanguages"/)
      || html.match(/"captionTracks":(\[[\s\S]*?\])/);
    if (!captionMatch) {
      console.log(`[YouTube] captionTracks nao encontrado no HTML para ${videoId}`);
      return null;
    }

    let tracks: Array<{ baseUrl: string; languageCode: string; vssId?: string }>;
    try {
      tracks = JSON.parse(captionMatch[1]);
    } catch {
      console.log(`[YouTube] JSON parse captionTracks falhou`);
      return null;
    }
    if (!tracks.length) {
      console.log(`[YouTube] captionTracks vazio para ${videoId}, tentando ASR direto...`);
    }

    // Prioridade: pt > pt-BR > qualquer pt* > en > primeiro disponivel
    const pick = tracks.length
      ? (tracks.find(t => t.languageCode === "pt") ||
         tracks.find(t => t.languageCode === "pt-BR") ||
         tracks.find(t => t.languageCode?.startsWith("pt")) ||
         tracks.find(t => t.languageCode === "en") ||
         tracks[0])
      : null;

    let captionUrl: string | null = null;
    if (pick?.baseUrl) {
      // URL direta do captionTrack
      captionUrl = pick.baseUrl.replace(/\\u0026/g, "&") + "&fmt=json3";
      console.log(`[YouTube] Buscando legenda lang=${pick.languageCode} para ${videoId}`);
    } else {
      // Fallback: tentar ASR (auto-gerado) direto — pt, pt-BR, en
      // Muitos videos BR tem apenas ASR que nao aparece em captionTracks
      for (const lang of ["pt", "pt-BR", "en"]) {
        const asrUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&kind=asr`;
        console.log(`[YouTube] Tentando ASR timedtext lang=${lang} para ${videoId}`);
        try {
          const asrRes = await proxyFetch(asrUrl, {
            ...baseInit,
            headers: { "User-Agent": UA, "Cookie": CONSENT_COOKIE },
          });
          if (asrRes.ok) {
            const asrData = await asrRes.json() as { events?: Array<{ segs?: Array<{ utf8: string }> }> };
            const asrText = (asrData.events || [])
              .filter((e) => e.segs)
              .flatMap((e) => (e.segs || []).map((s) => (s.utf8 || "").replace(/\n/g, " ")))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            if (asrText.length > 50) {
              console.log(`[YouTube] OK ASR timedtext lang=${lang} (${asrText.length} chars)`);
              return asrText;
            }
          }
        } catch {
          // continua para proximo idioma
        }
      }
      return null;
    }

    const txRes = await proxyFetch(captionUrl, {
      ...baseInit,
      headers: { "User-Agent": UA, "Cookie": CONSENT_COOKIE },
    });
    if (!txRes.ok) {
      console.log(`[YouTube] legenda nao ok: ${txRes.status}`);
      return null;
    }

    const data = await txRes.json() as { events?: Array<{ segs?: Array<{ utf8: string }> }> };
    const text = (data.events || [])
      .filter(e => e.segs)
      .flatMap(e => (e.segs || []).map(s => (s.utf8 || "").replace(/\n/g, " ")))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 50 ? text : null;
  } catch (err) {
    console.log(`[YouTube] fetchTranscriptFromPage erro: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Faz UMA tentativa com um proxy + idioma especifico.
 * Usa undici.fetch com ProxyAgent (dispatcher) + consent cookie.
 */
async function singleAttempt(videoId: string, lang: string, sessionId: number): Promise<{ text: string | null; availableLangs?: string[]; isRateLimit?: boolean; error?: string }> {
  const dispatcher = await getProxyDispatcher(sessionId);

  // undici.fetch com dispatcher para TODAS as requests (critico!)
  const proxyFetchFn = async ({ url, userAgent }: { url: string; lang?: string; userAgent?: string }) => {
    return proxyFetch(url, {
      dispatcher,
      headers: {
        "User-Agent": userAgent || UA,
        "Cookie": CONSENT_COOKIE,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
  };

  const proxyPostFn = async ({ url, method, body, headers }: { url: string; method: string; body: string; headers: Record<string, string> }) => {
    return proxyFetch(url, {
      method,
      body,
      dispatcher,
      headers: {
        ...headers,
        "Cookie": CONSENT_COOKIE,
      },
    });
  };

  try {
    const result = await fetchTranscript(videoId, {
      lang,
      videoFetch: proxyFetchFn as any,
      playerFetch: proxyPostFn as any,
      transcriptFetch: proxyFetchFn as any,
    });

    if (result && result.length > 0) {
      const text = result
        .map((s: { text: string }) => s.text)
        .join(" ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 50) return { text };
    }
    return { text: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : "";
    const cause = err instanceof Error && (err as any).cause ? String((err as any).cause) : "";
    console.log(`[YouTube] lang=${lang} session=${sessionId}: ${msg.substring(0, 200)}`);
    if (cause) console.log(`[YouTube] cause: ${cause.substring(0, 200)}`);
    if (stack && msg.includes("fetch failed")) console.log(`[YouTube] stack: ${stack.substring(0, 300)}`);

    const isRateLimit = msg.includes("too many requests") || msg.includes("429");

    const availMatch = msg.match(/Available languages?: (.+?)\.?\s*(?:Please|$)/i);
    if (availMatch) {
      const available = availMatch[1].split(",").map(s => s.trim()).filter(Boolean);
      return { text: null, availableLangs: available, isRateLimit, error: msg.substring(0, 200) };
    }
    return { text: null, isRateLimit, error: msg.substring(0, 200) };
  }
}

/**
 * Busca legendas de um video usando proxy residencial.
 * Cada tentativa usa um proxy diferente (IP diferente).
 * Se o idioma nao existe, extrai a lista de disponiveis e tenta cada um.
 */
export async function getVideoTranscript(videoId: string, preferredLang: string = "pt"): Promise<string> {
  console.log(`[YouTube] Transcrevendo video ${videoId}...`);

  // Tentativa 0: yt-dlp (mais confiavel, suporta ASR, funciona em Alpine sem proxy)
  const ytDlpText = await fetchTranscriptViaYtDlp(videoId);
  if (ytDlpText) {
    console.log(`[YouTube] OK yt-dlp (${ytDlpText.length} chars)`);
    return ytDlpText;
  }
  console.log(`[YouTube] yt-dlp falhou ou nao disponivel, tentando via HTML/proxy...`);

  // Tentativa 1: extracao manual do HTML via proxy (diagProxy confirma: hasCaptions:true com proxy+CONSENT_COOKIE)
  const sessionId0 = Math.floor(Math.random() * 200000) + 1;
  const dispatcher0 = await getProxyDispatcher(sessionId0);
  console.log(`[YouTube] Tentando extracao direta do HTML (proxy ${sessionId0}) para ${videoId}`);
  const directText = await fetchTranscriptFromPage(videoId, dispatcher0);
  if (directText) {
    console.log(`[YouTube] OK extracao direta (${directText.length} chars)`);
    return directText;
  }
  console.log(`[YouTube] Extracao direta falhou, tentando via proxy + youtube-transcript-plus...`);

  // Tentativa 2: youtube-transcript-plus com proxy (fallback)
  const langQueue = ["pt", "pt-BR", "en", preferredLang].filter((v, i, a) => a.indexOf(v) === i);
  const tried = new Set<string>();

  // Diagnstico: verificar se yt-dlp esta instalado (aparece no error message)
  const ytDlpVersion = await new Promise<string>((resolve) => {
    const bin = process.env.YTDLP_PATH || "yt-dlp";
    execFile(bin, ["--version"], { timeout: 5_000 }, (err, stdout) => {
      if (err) resolve(`yt-dlp:ERRO(${(err as NodeJS.ErrnoException).code || err.message?.substring(0, 30)})`);
      else resolve(`yt-dlp:${stdout.trim()}`);
    });
  });
  console.log(`[YouTube] DIAG ${ytDlpVersion}`);

  const errors: string[] = [`direto: sem legendas`, ytDlpVersion];
  let rateLimitRetries = 0;
  const MAX_RATE_LIMIT_RETRIES = 3;

  for (let i = 0; i < langQueue.length && i < 15; i++) {
    const lang = langQueue[i];
    if (tried.has(lang)) continue;
    tried.add(lang);

    const sessionId = Math.floor(Math.random() * 200000) + 1;
    console.log(`[YouTube] Tentando lang=${lang} (proxy ${sessionId})`);

    const { text, availableLangs, isRateLimit, error } = await singleAttempt(videoId, lang, sessionId);

    if (text) {
      console.log(`[YouTube] OK lang=${lang} (${text.length} chars)`);
      return text;
    }

    errors.push(`${lang}: ${error || "sem resultado"}`);

    if (isRateLimit && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
      rateLimitRetries++;
      tried.delete(lang);
      i--;
      console.log(`[YouTube] Rate limit, aguardando 2s antes de retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES}...`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    if (availableLangs) {
      const ptLangs = availableLangs.filter(l => l.toLowerCase().startsWith("pt"));
      const otherLangs = availableLangs.filter(l => !l.toLowerCase().startsWith("pt"));

      for (const avail of ptLangs) {
        if (!tried.has(avail) && !langQueue.includes(avail)) {
          langQueue.push(avail);
        }
      }
      for (const avail of otherLangs) {
        if (!tried.has(avail) && !langQueue.includes(avail)) {
          langQueue.push(avail);
        }
      }
    }

    if (i < langQueue.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error(
    `Nao foi possivel obter legendas apos ${tried.size} tentativas. ` +
    `Erros: [${errors.join(" | ")}]. ` +
    "Verifique se o video possui legendas habilitadas."
  );
}

/**
 * Busca info basica do video (titulo, etc) via HTML scraping com proxy
 */
export async function getVideoInfo(videoId: string): Promise<{ title: string; hasCaptions: boolean }> {
  try {
    const dispatcher = await getProxyDispatcher();
    const res = await proxyFetch(`https://www.youtube.com/watch?v=${videoId}`, {
      dispatcher,
      headers: {
        "User-Agent": UA,
        "Cookie": CONSENT_COOKIE,
        "Accept-Language": "pt-BR",
      },
    });
    const html = await res.text();

    const titleMatch = html.match(/<title>(.+?)<\/title>/);
    const title = titleMatch?.[1]?.replace(" - YouTube", "").trim() || `Video ${videoId}`;
    const hasCaptions = html.includes("captionTracks");

    return { title, hasCaptions };
  } catch {
    return { title: `Video ${videoId}`, hasCaptions: true };
  }
}

/**
 * Transcreve um video e ingere no RAG
 */
export async function transcribeAndIngest(
  videoId: string,
  title: string,
  category: string = "general"
): Promise<TranscriptResult> {
  try {
    if (!title || title.startsWith('Video ')) {
      try {
        const vInfo = await getVideoInfo(videoId);
        title = vInfo.title;
      } catch {
        // manter titulo original
      }
    }

    const transcript = await getVideoTranscript(videoId);

    if (!transcript || transcript.length < 50) {
      return {
        videoId,
        title,
        transcript: "",
        chunks: 0,
        success: false,
        error: "Transcricao muito curta ou vazia",
      };
    }

    const doc: IngestDocument = {
      title: `[YouTube] ${title}`,
      content: transcript,
      category,
      source: "YouTube",
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    const result = await ingestDocument(doc);

    return {
      videoId,
      title,
      transcript: transcript.slice(0, 200) + "...",
      chunks: result.chunksCreated,
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    return {
      videoId,
      title,
      transcript: "",
      chunks: 0,
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Diagnostico: testa proxy e YouTube connectivity
 */
export async function diagProxy(videoId: string = "dQw4w9WgXcQ"): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = { videoId, timestamp: new Date().toISOString() };

  // Test 1: proxy env vars
  results.proxyHost = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
  results.proxyUser = process.env.WEBSHARE_PROXY_USER || "lumgcvpn-rotate";
  results.proxyPassSet = !!(process.env.WEBSHARE_PROXY_PASS);
  results.proxyPort = process.env.WEBSHARE_PROXY_PORT || "80";
  results.nodeVersion = process.version;

  // Test 1.5: DNS resolution
  try {
    const host = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
    const dnsResult = await lookup(host);
    results.dnsResolve = { host, ip: dnsResult.address, family: dnsResult.family };
  } catch (e) {
    results.dnsResolve = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test 2: direct fetch to youtube (no proxy, globalThis.fetch)
  try {
    const directRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
    });
    results.directFetch = { status: directRes.status, ok: directRes.ok };
  } catch (e) {
    results.directFetch = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test 3: globalThis.fetch + undici ProxyAgent dispatcher (DNS pre-resolved)
  try {
    const dispatcher = await getProxyDispatcher();
    const proxyRes = await proxyFetch(`https://www.youtube.com/watch?v=${videoId}`, {
      dispatcher,
      headers: { "User-Agent": UA, "Cookie": CONSENT_COOKIE, "Accept-Language": "pt-BR" },
    });
    const html = await proxyRes.text();
    results.proxyFetch = {
      method: "globalThis.fetch+dispatcher",
      status: proxyRes.status,
      ok: proxyRes.ok,
      htmlLength: html.length,
      hasTitle: html.includes("<title>"),
      hasCaptions: html.includes("captionTracks"),
      titleSnippet: html.match(/<title>(.+?)<\/title>/)?.[1]?.substring(0, 80),
    };
  } catch (e) {
    results.proxyFetch = { method: "globalThis.fetch+dispatcher+dnsPreResolved", error: e instanceof Error ? e.message : String(e), cause: (e as any)?.cause?.toString() };
  }

  // Test 4: transcript attempt
  try {
    const sessionId = Math.floor(Math.random() * 200000) + 1;
    const attempt = await singleAttempt(videoId, "en", sessionId);
    results.transcriptAttempt = {
      hasText: !!attempt.text,
      textLength: attempt.text?.length || 0,
      availableLangs: attempt.availableLangs,
      isRateLimit: attempt.isRateLimit,
      error: attempt.error,
    };
  } catch (e) {
    results.transcriptAttempt = { error: e instanceof Error ? e.message : String(e) };
  }

  return results;
}

/**
 * Transcreve multiplos videos em batch
 */
export async function transcribeBatch(
  videos: { id: string; title: string }[],
  category: string = "general"
): Promise<TranscriptResult[]> {
  const results: TranscriptResult[] = [];

  for (const video of videos) {
    const result = await transcribeAndIngest(video.id, video.title, category);
    results.push(result);
  }

  return results;
}
