/**
 * Servico de transcricao de videos do YouTube para RAG
 *
 * Estrategia de fallback (YouTube bloqueia bots em IPs de datacenter):
 *   1. youtube-caption-extractor (dual method: XML + engagement panel)
 *   2. youtubei.js timedtext API (fallback)
 *
 * Ref: https://github.com/LuanRT/YouTube.js/issues/1102
 */

import { getSubtitles, getVideoDetails } from "youtube-caption-extractor";
import { Innertube } from "youtubei.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ingestDocument, type IngestDocument } from "@/lib/rag/ingest";

/**
 * Cria fetch com proxy Webshare (residencial) para evitar bloqueio YouTube
 * Env vars: WEBSHARE_PROXY_HOST, WEBSHARE_PROXY_USER, WEBSHARE_PROXY_PASS, WEBSHARE_PROXY_PORT
 */
function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const host = process.env.WEBSHARE_PROXY_HOST;
  const user = process.env.WEBSHARE_PROXY_USER;
  const pass = process.env.WEBSHARE_PROXY_PASS;
  const port = process.env.WEBSHARE_PROXY_PORT || "80";

  if (!host || !user || !pass) return undefined;

  return new HttpsProxyAgent(`http://${user}:${pass}@${host}:${port}`);
}

function createProxiedFetch(): typeof globalThis.fetch | undefined {
  const agent = getProxyAgent();
  if (!agent) return undefined;

  return ((input: any, init?: any) => {
    return fetch(input, { ...init, agent } as any);
  }) as typeof globalThis.fetch;
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
 * Cria instancia do Innertube (reusavel)
 */
async function createYT() {
  const proxiedFetch = createProxiedFetch();
  return Innertube.create({
    generate_session_locally: true,
    ...(proxiedFetch ? { fetch: proxiedFetch } : {}),
  });
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

  const proxiedFetch = createProxiedFetch() || fetch;
  const res = await proxiedFetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
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
  const yt = await createYT();
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

// ===== METODO 1: youtube-caption-extractor (primario) =====

/**
 * Tenta extrair legendas usando youtube-caption-extractor
 * Mais robusto contra bloqueios do YouTube (dual method)
 */
async function transcriptViaCaptionExtractor(videoId: string, lang: string = "pt"): Promise<string | null> {
  const languages = [lang, "pt", "pt-BR", "en", ""];

  for (const tryLang of languages) {
    try {
      const subtitles = await getSubtitles({ videoID: videoId, lang: tryLang || undefined });

      if (subtitles && subtitles.length > 0) {
        const text = subtitles
          .map((s: { text: string }) => s.text)
          .join(" ")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 50) {
          console.log(`[YouTube] Caption extractor OK (lang=${tryLang || 'auto'}, ${text.length} chars)`);
          return text;
        }
      }
    } catch (err) {
      console.log(`[YouTube] Caption extractor falhou (lang=${tryLang || 'auto'}):`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

// ===== METODO 2: HTML scraping direto (mais robusto) =====

interface TimedTextEvent {
  segs?: { utf8: string }[];
}

interface TimedTextResponse {
  events?: TimedTextEvent[];
}

interface CaptionTrackRaw {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string };
}

/**
 * Extrai legendas direto do HTML da pagina do YouTube
 * Nao depende de Innertube/decipher - pega captionTracks do ytInitialPlayerResponse
 * Usa proxy para evitar bloqueio de datacenter
 */
async function transcriptViaHtmlScraping(videoId: string, preferredLang: string = "pt"): Promise<string | null> {
  try {
    const proxiedFetch = createProxiedFetch() || fetch;
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const res = await proxiedFetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      console.log(`[YouTube] HTML scraping: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Extrair ytInitialPlayerResponse do HTML
    const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s)
      || html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);

    if (!playerMatch) {
      console.log("[YouTube] HTML scraping: ytInitialPlayerResponse nao encontrado");
      return null;
    }

    let playerData: any;
    try {
      playerData = JSON.parse(playerMatch[1]);
    } catch {
      console.log("[YouTube] HTML scraping: falha ao parsear playerResponse");
      return null;
    }

    const captionTracks: CaptionTrackRaw[] =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      console.log("[YouTube] HTML scraping: sem captionTracks");
      return null;
    }

    console.log(`[YouTube] HTML scraping: ${captionTracks.length} tracks: ${captionTracks.map(t => `${t.languageCode}(${t.kind || 'manual'})`).join(', ')}`);

    // Priorizar tracks
    const priority = [
      captionTracks.find(t => t.languageCode === 'pt' && t.kind !== 'asr'),
      captionTracks.find(t => t.languageCode === 'pt-BR' && t.kind !== 'asr'),
      captionTracks.find(t => t.languageCode?.startsWith('pt')),
      captionTracks.find(t => t.languageCode === preferredLang && t.kind !== 'asr'),
      captionTracks.find(t => t.languageCode === preferredLang),
      captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr'),
      captionTracks.find(t => t.languageCode === 'en'),
      captionTracks[0],
    ];

    const selectedTrack = priority.find(Boolean);
    if (!selectedTrack?.baseUrl) {
      console.log("[YouTube] HTML scraping: nenhum track com baseUrl");
      return null;
    }

    // Buscar timedtext JSON
    const ttUrl = selectedTrack.baseUrl + '&fmt=json3';
    const ttRes = await proxiedFetch(ttUrl);

    if (!ttRes.ok) {
      console.log(`[YouTube] HTML scraping: timedtext HTTP ${ttRes.status}`);
      return null;
    }

    const data: TimedTextResponse = await ttRes.json();

    if (!data.events || data.events.length === 0) {
      console.log("[YouTube] HTML scraping: events vazio");
      return null;
    }

    const transcript = data.events
      .filter(e => e.segs)
      .map(e => e.segs!.map(s => s.utf8).join(''))
      .join(' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (transcript.length > 50) {
      console.log(`[YouTube] HTML scraping OK (lang=${selectedTrack.languageCode}, ${transcript.length} chars)`);
      return transcript;
    }

    return null;
  } catch (err) {
    console.log("[YouTube] HTML scraping falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ===== METODO 3: youtubei.js timedtext (ultimo fallback) =====

/**
 * Tenta extrair legendas via youtubei.js + timedtext API
 * Pode falhar em servidores cloud (YouTube bloqueia IPs de datacenter)
 * NOTA: youtubei.js v16 tem bug com decipher - warnings sao esperados
 */
async function transcriptViaInnertube(videoId: string, preferredLang: string = "pt"): Promise<string | null> {
  try {
    const yt = await createYT();
    const info = await yt.getInfo(videoId);

    if (!info.captions) {
      console.log("[YouTube] Innertube: sem captions no response");
      return null;
    }

    const tracks = info.captions.caption_tracks;
    if (!tracks || tracks.length === 0) {
      console.log("[YouTube] Innertube: caption_tracks vazio");
      return null;
    }

    console.log(`[YouTube] Innertube: ${tracks.length} tracks encontradas: ${tracks.map(t => `${t.language_code}(${t.kind || 'manual'})`).join(', ')}`);

    const priority = [
      tracks.find(t => t.language_code === 'pt' && t.kind !== 'asr'),
      tracks.find(t => t.language_code === 'pt-BR' && t.kind !== 'asr'),
      tracks.find(t => t.language_code?.startsWith('pt')),
      tracks.find(t => t.language_code === preferredLang && t.kind !== 'asr'),
      tracks.find(t => t.language_code === preferredLang),
      tracks.find(t => t.language_code === 'en' && t.kind !== 'asr'),
      tracks.find(t => t.language_code === 'en'),
      tracks[0],
    ];

    const selectedTrack = priority.find(Boolean);
    if (!selectedTrack?.base_url) {
      console.log("[YouTube] Innertube: nenhum track com base_url");
      return null;
    }

    const url = selectedTrack.base_url + '&fmt=json3';
    const timedtextFetch = createProxiedFetch() || fetch;
    const res = await timedtextFetch(url);

    if (!res.ok) {
      console.log(`[YouTube] Innertube: timedtext HTTP ${res.status}`);
      return null;
    }

    const data: TimedTextResponse = await res.json();

    if (!data.events || data.events.length === 0) {
      console.log("[YouTube] Innertube: events vazio");
      return null;
    }

    const transcript = data.events
      .filter(e => e.segs)
      .map(e => e.segs!.map(s => s.utf8).join(''))
      .join(' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (transcript.length > 50) {
      console.log(`[YouTube] Innertube OK (${transcript.length} chars)`);
      return transcript;
    }

    return null;
  } catch (err) {
    console.log("[YouTube] Innertube falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Busca legendas de um video com fallback chain
 * Metodo 1: HTML scraping direto + proxy (mais robusto, sem decipher)
 * Metodo 2: youtube-caption-extractor (sem proxy, funciona local)
 * Metodo 3: youtubei.js + timedtext API (ultimo recurso)
 */
export async function getVideoTranscript(videoId: string, preferredLang: string = "pt"): Promise<string> {
  console.log(`[YouTube] Transcrevendo video ${videoId}...`);

  // Metodo 1: HTML scraping direto (usa proxy, sem decipher)
  const result1 = await transcriptViaHtmlScraping(videoId, preferredLang);
  if (result1) return result1;

  // Metodo 2: youtube-caption-extractor (sem proxy)
  const result2 = await transcriptViaCaptionExtractor(videoId, preferredLang);
  if (result2) return result2;

  // Metodo 3: youtubei.js + timedtext (ultimo recurso)
  const result3 = await transcriptViaInnertube(videoId, preferredLang);
  if (result3) return result3;

  throw new Error(
    "Nao foi possivel obter legendas deste video. " +
    "Verifique se o video possui legendas (manuais ou automaticas) habilitadas. " +
    "Videos sem legendas nao podem ser transcritos."
  );
}

/**
 * Busca info basica do video (titulo, etc)
 * Usa youtube-caption-extractor primeiro (mais confiavel)
 */
export async function getVideoInfo(videoId: string): Promise<{ title: string; hasCaptions: boolean }> {
  // Tentar youtube-caption-extractor primeiro
  try {
    const details = await getVideoDetails({ videoID: videoId, lang: "pt" });
    if (details?.title) {
      // Se retornou detalhes, provavelmente tem legendas
      const hasCaptions = details.subtitles && details.subtitles.length > 0;
      return {
        title: details.title,
        hasCaptions: hasCaptions ?? false,
      };
    }
  } catch {
    // fallback para innertube
  }

  // Fallback: youtubei.js
  try {
    const yt = await createYT();
    const info = await yt.getInfo(videoId);
    return {
      title: info.basic_info.title || `Video ${videoId}`,
      hasCaptions: !!info.captions && (info.captions.caption_tracks?.length || 0) > 0,
    };
  } catch {
    return {
      title: `Video ${videoId}`,
      hasCaptions: true, // Assumir que tem - vai tentar transcrever de qualquer forma
    };
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
    // Se nao tem titulo, buscar do video
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
