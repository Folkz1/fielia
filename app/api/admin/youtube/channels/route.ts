import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractChannelInfo, getChannelVideos } from "@/lib/youtube/transcript";

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
 * GET /api/admin/youtube/channels
 * Listar canais configurados
 */
export async function GET() {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.youTubeChannel.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("[YouTube Channels] Erro:", error);
    return NextResponse.json(
      { error: "Falha ao listar canais" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/youtube/channels
 * Adicionar canal para monitorar
 *
 * Body: { url, name? }
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, name } = body;

    if (!url) {
      return NextResponse.json({ error: "url obrigatoria" }, { status: 400 });
    }

    const channelInfo = extractChannelInfo(url);
    if (!channelInfo) {
      return NextResponse.json({ error: "URL de canal invalida" }, { status: 400 });
    }

    const channelId = channelInfo.value;

    // Verificar se ja existe
    const existing = await prisma.youTubeChannel.findUnique({
      where: { channelId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Canal ja cadastrado", channel: existing },
        { status: 409 }
      );
    }

    // Tentar obter nome do canal se nao fornecido
    let channelName = name || channelInfo.value;
    try {
      const videos = await getChannelVideos(url, 1);
      if (!name && videos.length > 0) {
        channelName = channelInfo.value; // fallback
      }
    } catch {
      // Usar nome fornecido ou handle
    }

    const channel = await prisma.youTubeChannel.create({
      data: {
        channelId,
        name: channelName,
        url,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("[YouTube Channels] Erro ao criar:", error);
    return NextResponse.json(
      { error: "Falha ao criar canal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/youtube/channels
 * Remover canal
 *
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
    }

    await prisma.youTubeChannel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[YouTube Channels] Erro ao deletar:", error);
    return NextResponse.json(
      { error: "Falha ao deletar canal" },
      { status: 500 }
    );
  }
}
