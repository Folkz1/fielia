import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=link_expirado", appUrl)
    );
  }

  const now = new Date();
  const user = await prisma.user.findFirst({
    where: {
      magicToken: token,
      magicTokenExp: { gt: now },
    },
    select: { id: true, email: true, name: true, isPremium: true },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login?error=link_expirado", appUrl)
    );
  }

  // Limpar token após uso
  await prisma.user.update({
    where: { id: user.id },
    data: { magicToken: null, magicTokenExp: null },
  });

  // Criar JWT compatível com NextAuth v5
  const secret = process.env.NEXTAUTH_SECRET || "fiel-ia-secret";
  const jwtToken = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    salt: "authjs.session-token",
  });

  // Configurar cookie
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const response = NextResponse.redirect(new URL("/bem-vindo", appUrl));
  response.cookies.set(cookieName, jwtToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });

  return response;
}
