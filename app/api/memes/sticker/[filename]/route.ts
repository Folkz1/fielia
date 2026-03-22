import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { convertToStickerBuffer } from "@/lib/sticker";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/memes/sticker/[filename]
 * Converts a meme image to WebP 512x512 sticker format.
 * Tries filesystem first, falls back to DB imageData.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const safe = path.basename(filename);
  if (safe !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
  }

  const ext = path.extname(safe).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    return NextResponse.json({ error: "Formato não suportado" }, { status: 400 });
  }

  let fileBuffer: Buffer | null = null;

  // Try filesystem first
  const filepath = path.join(process.cwd(), "public", "memes", safe);
  try {
    fileBuffer = await fs.readFile(filepath);
  } catch {
    // File not on disk - try DB fallback
  }

  // DB fallback
  if (!fileBuffer) {
    try {
      const meme = await prisma.meme.findFirst({
        where: { imageUrl: { contains: safe } },
        select: { imageData: true },
      });
      if (meme?.imageData) {
        fileBuffer = Buffer.from(meme.imageData);
      }
    } catch (err) {
      console.error("[Sticker] DB fallback error:", err);
    }
  }

  if (!fileBuffer) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    const webpBuffer = await convertToStickerBuffer(fileBuffer);
    const stickerFilename = safe.replace(ext, ".webp");

    return new NextResponse(new Uint8Array(webpBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="sticker-${stickerFilename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[Sticker] Conversion error:", err);
    return NextResponse.json({ error: "Erro ao converter figurinha" }, { status: 500 });
  }
}
