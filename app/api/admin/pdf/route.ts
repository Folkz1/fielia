import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf/extract";
import { ingestDocument } from "@/lib/rag/ingest";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const category = formData.get("category") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "Arquivo PDF obrigatorio" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Apenas arquivos PDF sao aceitos" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);

    const docTitle = title || file.name.replace(/\.pdf$/i, "");

    const result = await ingestDocument({
      title: `[PDF] ${docTitle}`,
      content: text,
      category,
      source: "PDF Upload",
    });

    return NextResponse.json({
      success: result.success,
      chunksCreated: result.chunksCreated,
      textLength: text.length,
      fileName: file.name,
      error: result.error,
    });
  } catch (error) {
    console.error("[PDF] Erro ao processar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar PDF" },
      { status: 500 }
    );
  }
}
