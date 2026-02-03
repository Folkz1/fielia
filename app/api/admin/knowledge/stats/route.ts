import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Total de documentos
    const totalDocuments = await prisma.corinthiansKnowledge.count();

    // Contar por categoria
    const categoryGroups = await prisma.corinthiansKnowledge.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const categories = categoryGroups.map((g) => ({
      name: g.category,
      count: g._count.id,
    }));

    return NextResponse.json({
      totalDocuments,
      categories,
    });
  } catch (error) {
    console.error("Erro ao buscar stats:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
