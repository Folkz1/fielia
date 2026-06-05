import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Controle de creditos do OpenRouter — saldo da conta usada pelo FIEL.IA.
 * Le GET https://openrouter.ai/api/v1/credits (total comprado vs total gasto).
 * Admin-only: a key e sensivel e o saldo e informacao de conta.
 */

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY ausente no ambiente" }, { status: 500 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const d = (data as { data?: { total_credits?: number; total_usage?: number } })?.data ?? {};
    const totalCredits = Number(d.total_credits ?? 0);
    const totalUsage = Number(d.total_usage ?? 0);
    return NextResponse.json({
      totalCredits,
      totalUsage,
      remaining: totalCredits - totalUsage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar creditos" },
      { status: 502 }
    );
  }
}
