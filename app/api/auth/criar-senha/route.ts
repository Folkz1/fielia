import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sessao expirada. Acesse o link enviado por email novamente." },
        { status: 401 }
      );
    }

    const { password } = await req.json().catch(() => ({}));

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Senha obrigatoria." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no minimo 6 caracteres." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json({ error: "Senha muito longa." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Criar Senha]", error);
    return NextResponse.json({ error: "Erro ao salvar senha. Tente novamente." }, { status: 500 });
  }
}
