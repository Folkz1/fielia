import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany();
    const result: Record<string, string> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return NextResponse.json(result);
  } catch (error) {
    // Tabela pode nao existir ainda
    console.error("[Config] GET error:", error);
    return NextResponse.json({});
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value !== "string") {
      return NextResponse.json({ error: "key e value (string) obrigatorios" }, { status: 400 });
    }

    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[Config] PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar config" },
      { status: 500 }
    );
  }
}
