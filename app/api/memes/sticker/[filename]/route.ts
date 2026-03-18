import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { convertToStickerBuffer } from "@/lib/sticker";

/**
 * GET /api/memes/sticker/[filename]
 * Converts a meme image to WebP 512x512 sticker format (transparent background).
 * Progressively reduces quality if result exceeds 100KB.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize filename to prevent directory traversal
  const safe = path.basename(filename);
  if (safe !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
  }

  const ext = path.extname(safe).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    return NextResponse.json({ error: "Formato não suportado" }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), "public", "memes", safe);

  try {
    const fileBuffer = await fs.readFile(filepath);
    const webpBuffer = await convertToStickerBuffer(fileBuffer);

    // Derive download filename
    const stickerFilename = safe.replace(ext, ".webp");

    return new NextResponse(new Uint8Array(webpBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="sticker-${stickerFilename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const isNotFound =
      err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
    if (isNotFound) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }
    console.error("[Sticker] Conversion error:", err);
    return NextResponse.json({ error: "Erro ao converter figurinha" }, { status: 500 });
  }
}
