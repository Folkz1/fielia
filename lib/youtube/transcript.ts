/**
 * Servico de transcricao de videos do YouTube para RAG
 *
 * Usa youtube-transcript-plus com proxy residencial Webshare.
 * CRITICO: usar undici.fetch com ProxyAgent (dispatcher) - node:fetch com HttpsProxyAgent NAO funciona.
 * CRITICO: enviar cookie SOCS de consent em TODAS as requests (bypass consent wall).
 */

import { fetchTranscript } from "youtube-transcript-plus";
import { Innertube, Platform } from "youtubei.js";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { ingestDocument, type IngestDocument } from "@/lib/rag/ingest";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_RETRIES = 3;

// Cookie de consent para bypass da consent wall do YouTube (obrigatorio com proxy)
const CONSENT_COOKIE = "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMjA4MDEuMDdfcDEYAiABGgJwdA";

/**
 * Cria undici ProxyAgent Webshare com session ID unico (sticky IP)
 */
function getProxyDispatcher(sessionId?: number): ProxyAgent {
  const host = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
  const baseUser = process.env.WEBSHARE_PROXY_USER || "lumgcvpn-rotate";
  const pass = process.env.WEBSHARE_PROXY_PASS || "";
  const port = process.env.WEBSHARE_PROXY_PORT || "80";

  const proxyUser = sessionId
    ? baseUser.replace("rotate", String(sessionId))
    : baseUser;

  return new ProxyAgent(`http://${proxyUser}:${pass}@${host}:${port}`);
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

  const dispatcher = getProxyDispatcher();
  const res = await undiciFetch(pageUrl, {
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

  const dispatcher = getProxyDispatcher();
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
 * Faz UMA tentativa com um proxy + idioma especifico.
 * Usa undici.fetch com ProxyAgent (dispatcher) + consent cookie.
 */
async function singleAttempt(videoId: string, lang: string, sessionId: number): Promise<{ text: string | null; availableLangs?: string[]; isRateLimit?: boolean }> {
  const dispatcher = getProxyDispatcher(sessionId);

  // undici.fetch com dispatcher para TODAS as requests (critico!)
  const proxyFetchFn = async ({ url, userAgent }: { url: string; lang?: string; userAgent?: string }) => {
    return undiciFetch(url, {
      dispatcher,
      headers: {
        "User-Agent": userAgent || UA,
        "Cookie": CONSENT_COOKIE,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
  };

  const proxyPostFn = async ({ url, method, body, headers }: { url: string; method: string; body: string; headers: Record<string, string> }) => {
    return undiciFetch(url, {
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
    console.log(`[YouTube] lang=${lang} session=${sessionId}: ${msg.substring(0, 120)}`);

    const isRateLimit = msg.includes("too many requests") || msg.includes("429");

    const availMatch = msg.match(/Available languages?: (.+?)\.?\s*(?:Please|$)/i);
    if (availMatch) {
      const available = availMatch[1].split(",").map(s => s.trim()).filter(Boolean);
      return { text: null, availableLangs: available, isRateLimit };
    }
    return { text: null, isRateLimit };
  }
}

/**
 * Busca legendas de um video usando proxy residencial.
 * Cada tentativa usa um proxy diferente (IP diferente).
 * Se o idioma nao existe, extrai a lista de disponiveis e tenta cada um.
 */
export async function getVideoTranscript(videoId: string, preferredLang: string = "pt"): Promise<string> {
  console.log(`[YouTube] Transcrevendo video ${videoId}...`);

  // Prioridade: pt > pt-BR > preferido (pt funciona melhor que pt-BR para auto-generated)
  const langQueue = ["pt", "pt-BR", preferredLang].filter((v, i, a) => a.indexOf(v) === i);
  const tried = new Set<string>();
  let lastError = "";
  let rateLimitRetries = 0;
  const MAX_RATE_LIMIT_RETRIES = 3;

  for (let i = 0; i < langQueue.length && i < 15; i++) {
    const lang = langQueue[i];
    if (tried.has(lang)) continue;
    tried.add(lang);

    const sessionId = Math.floor(Math.random() * 200000) + 1;
    console.log(`[YouTube] Tentando lang=${lang} (proxy ${sessionId})`);

    const { text, availableLangs, isRateLimit } = await singleAttempt(videoId, lang, sessionId);

    if (text) {
      console.log(`[YouTube] OK lang=${lang} (${text.length} chars)`);
      return text;
    }

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

    lastError = `lang=${lang} falhou`;

    if (i < langQueue.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error(
    `Nao foi possivel obter legendas apos ${tried.size} tentativas. ` +
    `Ultimo erro: ${lastError}. ` +
    "Verifique se o video possui legendas habilitadas."
  );
}

/**
 * Busca info basica do video (titulo, etc) via HTML scraping com proxy
 */
export async function getVideoInfo(videoId: string): Promise<{ title: string; hasCaptions: boolean }> {
  try {
    const dispatcher = getProxyDispatcher();
    const res = await undiciFetch(`https://www.youtube.com/watch?v=${videoId}`, {
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
