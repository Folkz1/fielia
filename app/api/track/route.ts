import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Eventos de funil aceitos. Qualquer outro tipo é ignorado (204) — evita lixo.
const ALLOWED = new Set([
  "page_view",
  "hero_cta_assinar",
  "hero_cta_grupo",
  "chip_click",
  "checkout_view",
  "checkout_submit",
  "group_redirect",
]);

function clip(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export async function POST(req: Request) {
  // Tracking é best-effort: nunca retorna erro pro cliente nem bloqueia navegação.
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const type = String((body as Record<string, unknown>)?.type || "");
    if (!ALLOWED.has(type)) return new NextResponse(null, { status: 204 });

    const b = body as Record<string, unknown>;
    await prisma.funnelEvent.create({
      data: {
        type,
        anonId: clip(b.anonId, 64) || "unknown",
        path: clip(b.path, 300),
        referrer: clip(b.referrer, 300),
        utmSource: clip(b.utmSource, 120),
        utmMedium: clip(b.utmMedium, 120),
        utmCampaign: clip(b.utmCampaign, 120),
        metadata:
          b.metadata && typeof b.metadata === "object"
            ? (b.metadata as object)
            : undefined,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
