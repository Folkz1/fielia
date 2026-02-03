import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    return NextResponse.json({ isAdmin: user?.isAdmin || false });
  } catch (error) {
    console.error("Erro ao verificar admin:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
