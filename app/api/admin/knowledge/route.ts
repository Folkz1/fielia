import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Verificar se o usuario e admin
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return user?.isAdmin || false;
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { content: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const items = await prisma.corinthiansKnowledge.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        source: true,
        sourceUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.corinthiansKnowledge.count({ where });

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error("Erro ao buscar conhecimento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
