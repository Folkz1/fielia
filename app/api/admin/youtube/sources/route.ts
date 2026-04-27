import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin || false;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\[YouTube\]\s*/i, "")
    .replace(/\s*\(parte\s+\d+\/\d+\)\s*$/i, "")
    .trim();
}

/**
 * GET /api/admin/youtube/sources
 * Lista vídeos únicos do YouTube já ingeridos no RAG.
 * Agrupa knowledge_base por sourceUrl WHERE source='YouTube'.
 */
export async function GET() {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.$queryRawUnsafe<
      { title: string; sourceUrl: string; chunk_count: number; added_at: Date }[]
    >(`
      SELECT
        MIN(title) AS title,
        "sourceUrl",
        COUNT(*)::int AS chunk_count,
        MIN("createdAt") AS added_at
      FROM knowledge_base
      WHERE source = 'YouTube' AND "sourceUrl" IS NOT NULL
      GROUP BY "sourceUrl"
      ORDER BY MIN("createdAt") DESC
    `);

    const sources = rows.map((r) => ({
      title: cleanTitle(r.title),
      sourceUrl: r.sourceUrl,
      chunkCount: r.chunk_count,
      addedAt: r.added_at,
    }));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[YouTube Sources] Erro ao listar:", error);
    return NextResponse.json({ error: "Falha ao listar fontes" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/youtube/sources
 * Remove todos os chunks de um vídeo específico do RAG.
 * Body: { sourceUrl: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourceUrl } = body;

    if (!sourceUrl || typeof sourceUrl !== "string") {
      return NextResponse.json({ error: "sourceUrl obrigatória" }, { status: 400 });
    }

    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM knowledge_base WHERE source = 'YouTube' AND "sourceUrl" = $1`,
      sourceUrl
    );

    return NextResponse.json({ success: true, deleted: result });
  } catch (error) {
    console.error("[YouTube Sources] Erro ao deletar:", error);
    return NextResponse.json({ error: "Falha ao remover fonte" }, { status: 500 });
  }
}
