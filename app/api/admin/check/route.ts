import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function checkAdminWithRetry(userId: string, retries = 2): Promise<boolean | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      });
      return user?.isAdmin || false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Admin Check] Tentativa ${i + 1}/${retries + 1} falhou:`, msg);
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  return null; // todas as tentativas falharam
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false });
    }

    const result = await checkAdminWithRetry(session.user.id);

    if (result === null) {
      // Erro transiente (DNS, conexao) - retorna 503 para frontend retry
      return NextResponse.json(
        { isAdmin: false, error: "temporary" },
        { status: 503 }
      );
    }

    return NextResponse.json({ isAdmin: result });
  } catch (error) {
    console.error("[Admin Check] Erro inesperado:", error);
    return NextResponse.json(
      { isAdmin: false, error: "temporary" },
      { status: 503 }
    );
  }
}
