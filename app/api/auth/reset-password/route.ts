import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token e senha obrigatorios" }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: "Senha deve ter no minimo 6 caracteres" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: String(token) },
    });

    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      return NextResponse.json({ error: "Link expirado ou invalido. Solicite um novo." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Reset Password]", error);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
