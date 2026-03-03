import { NextRequest, NextResponse } from "next/server";
import { ingestDocument, ingestDocuments, IngestDocument } from "@/lib/rag";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/rag/ingest
 * Endpoint para ingestao de documentos no sistema RAG
 *
 * Auth: Bearer token via RAG_INGEST_API_KEY OU session de admin
 *
 * Body (documento unico):
 * {
 *   "title": "Titulo do documento",
 *   "content": "Conteudo do documento...",
 *   "category": "history|players|titles|stadium|torcida",
 *   "source": "Fonte opcional",
 *   "sourceUrl": "URL opcional"
 * }
 *
 * Body (batch):
 * {
 *   "documents": [{ title, content, category, source?, sourceUrl? }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticacao: API key OU session de admin
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.RAG_INGEST_API_KEY;
    let authorized = false;

    // Check 1: Bearer token
    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true;
    }

    // Check 2: Admin session (para chamadas do painel admin)
    if (!authorized) {
      const session = await auth();
      if (session?.user?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { isAdmin: true },
        });
        if (user?.isAdmin) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Verificar se e batch ou documento unico
    if (body.documents && Array.isArray(body.documents)) {
      // Batch mode
      const documents: IngestDocument[] = body.documents;

      if (documents.length === 0) {
        return NextResponse.json(
          { error: "Array de documentos vazio" },
          { status: 400 }
        );
      }

      // Validar cada documento
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (!doc.title || !doc.content || !doc.category) {
          return NextResponse.json(
            { error: `Documento ${i}: title, content e category sao obrigatorios` },
            { status: 400 }
          );
        }
      }

      const results = await ingestDocuments(documents);

      const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);
      const successCount = results.filter((r) => r.success).length;

      return NextResponse.json({
        success: successCount > 0,
        documentsProcessed: documents.length,
        documentsSuccess: successCount,
        totalChunksCreated: totalChunks,
        results,
      });
    } else {
      // Single document mode
      const { title, content, category, source, sourceUrl } = body;

      if (!title || !content || !category) {
        return NextResponse.json(
          { error: "title, content e category sao obrigatorios" },
          { status: 400 }
        );
      }

      const result = await ingestDocument({
        title,
        content,
        category,
        source,
        sourceUrl,
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("RAG Ingest Error:", error);
    return NextResponse.json(
      { error: "Falha ao ingerir documento", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag/ingest
 * Retorna informacoes sobre o endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/rag/ingest",
    method: "POST",
    description: "Endpoint para ingestao de documentos no sistema RAG",
    authentication: "Bearer token via RAG_INGEST_API_KEY",
    bodySchema: {
      singleDocument: {
        title: "string (required)",
        content: "string (required)",
        category: "string (required) - history|players|titles|stadium|torcida",
        source: "string (optional)",
        sourceUrl: "string (optional)",
      },
      batch: {
        documents: "array of single document objects",
      },
    },
    categories: ["history", "players", "titles", "stadium", "torcida"],
  });
}
