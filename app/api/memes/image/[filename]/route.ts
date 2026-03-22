import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * GET /api/memes/image/[filename]
 * Serve meme images from filesystem first, fallback to DB (imageData).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const safe = path.basename(filename);
  if (safe !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  // Try filesystem first (fast path)
  const filepath = path.join(process.cwd(), "public", "memes", safe);
  try {
    const file = await fs.readFile(filepath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // File not on disk - try DB fallback
  }

  // DB fallback: find meme by imageUrl pattern
  try {
    const meme = await prisma.meme.findFirst({
      where: {
        imageUrl: { contains: safe },
      },
      select: { imageData: true },
    });

    if (meme?.imageData) {
      const buffer = Buffer.from(meme.imageData);

      // Also write to disk for future fast access
      try {
        await fs.mkdir(path.join(process.cwd(), "public", "memes"), { recursive: true });
        await fs.writeFile(filepath, buffer);
      } catch {
        // Non-critical: disk write failed, still serve from DB
      }

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (err) {
    console.error("[Meme Image] DB fallback error:", err);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
