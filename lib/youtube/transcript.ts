/**
 * Servico de transcricao de videos do YouTube para RAG
 *
 * Usa youtube-transcript-plus com proxy residencial Webshare.
 * Retry com proxy diferente se falhar (ate MAX_RETRIES tentativas).
 */

import { fetchTranscript } from "youtube-transcript-plus";
import { Innertube } from "youtubei.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ingestDocument, type IngestDocument } from "@/lib/rag/ingest";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_RETRIES = 3;

/**
 * Cria proxy agent Webshare com session ID unico (sticky IP)
 */
function getProxyAgent(sessionId?: number): HttpsProxyAgent<string> {
  const host = process.env.WEBSHARE_PROXY_HOST || "p.webshare.io";
  const baseUser = process.env.WEBSHARE_PROXY_USER || "lumgcvpn-rotate";
  const pass = process.env.WEBSHARE_PROXY_PASS || "";
  const port = process.env.WEBSHARE_PROXY_PORT || "80";

  // Sticky session: trocar "rotate" por numero fixo
  const proxyUser = sessionId
    ? baseUser.replace("rotate", String(sessionId))
    : baseUser;

  return new HttpsProxyAgent(`http://${proxyUser}:${pass}@${host}:${port}`);
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

  const agent = getProxyAgent();
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    agent,
  } as any);

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

  const agent = getProxyAgent();
  const proxiedFetch = ((input: any, init?: any) =>
    fetch(input, { ...init, agent } as any)) as typeof globalThis.fetch;

  const yt = await Innertube.create({
    generate_session_locally: true,
    fetch: proxiedFetch,
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
 */
async function singleAttempt(videoId: string, lang: string, sessionId: number): Promise<{ text: string | null; availableLangs?: string[] }> {
  const agent = getProxyAgent(sessionId);

  const proxyFetchFn = async ({ url, userAgent }: { url: string; lang?: string; userAgent?: string }) => {
    return fetch(url, { headers: { "User-Agent": userAgent || UA }, agent } as any);
  };

  const proxyPostFn = async ({ url, method, body, headers }: { url: string; method: string; body: string; headers: Record<string, string> }) => {
    return fetch(url, { method, body, headers, agent } as any);
  };

  try {
    const result = await fetchTranscript(videoId, {
      lang,
      videoFetch: proxyFetchFn,
      playerFetch: proxyPostFn as any,
      transcriptFetch: proxyFetchFn,
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

    // Extrair idiomas disponiveis do erro
    const availMatch = msg.match(/Available languages?: (.+?)\.?\s*(?:Please|$)/i);
    if (availMatch) {
      const available = availMatch[1].split(",").map(s => s.trim()).filter(Boolean);
      return { text: null, availableLangs: available };
    }
    return { text: null };
  }
}

/**
 * Busca legendas de um video usando proxy residencial.
 * Cada tentativa usa um proxy diferente (IP diferente).
 * Se o idioma nao existe, extrai a lista de disponiveis e tenta cada um.
 */
export async function getVideoTranscript(videoId: string, preferredLang: string = "pt"): Promise<string> {
  console.log(`[YouTube] Transcrevendo video ${videoId}...`);

  // Sempre portugues - priorizar pt-BR > pt
  const langQueue = ["pt-BR", "pt", preferredLang].filter((v, i, a) => a.indexOf(v) === i);
  const tried = new Set<string>();
  let lastError = "";

  for (let i = 0; i < langQueue.length && i < MAX_RETRIES * 3; i++) {
    const lang = langQueue[i];
    if (tried.has(lang)) continue;
    tried.add(lang);

    // Proxy novo para cada tentativa (IP diferente = evita 429)
    const sessionId = Math.floor(Math.random() * 200000) + 1;
    console.log(`[YouTube] Tentando lang=${lang} (proxy ${sessionId})`);

    const { text, availableLangs } = await singleAttempt(videoId, lang, sessionId);

    if (text) {
      console.log(`[YouTube] OK lang=${lang} (${text.length} chars)`);
      return text;
    }

    // Se a lib retornou idiomas disponiveis, adicionar so os PT na fila
    if (availableLangs) {
      const ptLangs = availableLangs.filter(l => l.startsWith("pt"));
      for (const avail of ptLangs) {
        if (!tried.has(avail) && !langQueue.includes(avail)) {
          langQueue.push(avail);
        }
      }
    }

    lastError = `lang=${lang} falhou`;

    // Pequeno delay entre tentativas
    if (i < langQueue.length - 1) {
      await new Promise(r => setTimeout(r, 500));
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
    const agent = getProxyAgent();
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
      agent,
    } as any);
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
