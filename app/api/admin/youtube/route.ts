import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  extractVideoId,
  extractChannelInfo,
  getChannelVideos,
  getVideoInfo,
  transcribeAndIngest,
  transcribeBatch,
} from "@/lib/youtube/transcript";

/**
 * Middleware de autenticacao admin
 */
async function checkAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin || false;
}

/**
 * POST /api/admin/youtube
 * Ingerir video(s) do YouTube no RAG
 *
 * Body:
 * - { videoUrl, category? } - Transcrever um video
 * - { channelUrl, limit?, category? } - Transcrever videos de um canal
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const category = body.category || "general";

    // Modo: video unico
    if (body.videoUrl) {
      const videoId = extractVideoId(body.videoUrl);
      if (!videoId) {
        return NextResponse.json({ error: "URL de video invalida" }, { status: 400 });
      }

      // Buscar info do video (titulo) - nao bloquear por hasCaptions
      // pois o check pode dar falso negativo em servidores cloud
      const vInfo = await getVideoInfo(videoId);

      const result = await transcribeAndIngest(videoId, body.title || vInfo.title, category);
      return NextResponse.json(result);
    }

    // Modo: canal (listar e transcrever)
    if (body.channelUrl) {
      const limit = Math.min(body.limit || 5, 20);

      const videos = await getChannelVideos(body.channelUrl, limit);
      if (videos.length === 0) {
        return NextResponse.json({ error: "Nenhum video encontrado no canal" }, { status: 404 });
      }

      const results = await transcribeBatch(videos, category);
      const successCount = results.filter((r) => r.success).length;
      const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);

      return NextResponse.json({
        videosFound: videos.length,
        videosTranscribed: successCount,
        totalChunks,
        results,
      });
    }

    return NextResponse.json({ error: "videoUrl ou channelUrl obrigatorio" }, { status: 400 });
  } catch (error) {
    console.error("[YouTube] Erro:", error);
    return NextResponse.json(
      { error: "Falha ao processar", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/youtube
 * Listar videos do canal (preview sem transcrever)
 *
 * Query: ?channelUrl=...&limit=10
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channelUrl = req.nextUrl.searchParams.get("channelUrl");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);

    if (!channelUrl) {
      return NextResponse.json({ error: "channelUrl obrigatoria" }, { status: 400 });
    }

    const channelInfo = extractChannelInfo(channelUrl);
    if (!channelInfo) {
      return NextResponse.json({ error: "URL de canal invalida" }, { status: 400 });
    }

    const videos = await getChannelVideos(channelUrl, limit);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error("[YouTube] Erro ao listar videos:", error);
    return NextResponse.json(
      { error: "Falha ao listar videos", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
