/**
 * Servico de ingestao de documentos para RAG
 * Faz chunking do texto e gera embeddings para cada chunk
 */

import { prisma } from "@/lib/prisma";
import { generateEmbedding, EMBEDDING_DIMENSION } from "./embeddings";
import { cleanTextForRAG, smartChunk, isQualityChunk, simpleHash } from "./preprocess";

// Configuracoes de chunking (baseado no workflow n8n Dentaly)
const CHUNK_SIZE = 600; // caracteres
const CHUNK_OVERLAP = 80; // overlap para manter contexto entre chunks

export interface IngestDocument {
  title: string;
  content: string;
  category: string;
  source?: string;
  sourceUrl?: string;
}

export interface IngestResult {
  success: boolean;
  chunksCreated: number;
  documentId?: string;
  error?: string;
}

/**
 * Divide texto em chunks com overlap
 * @param text - Texto para dividir
 * @param chunkSize - Tamanho maximo de cada chunk
 * @param overlap - Quantidade de overlap entre chunks
 * @returns Array de chunks
 */
function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  // Normalizar quebras de linha
  let normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Ajudar a criar quebras antes de headers markdown
  normalized = normalized.replace(/(\s)#\s+/g, "\n# ");
  normalized = normalized.replace(/^#\s+/gm, "## ");
  normalized = normalized.replace(/[ \t]*##\s+/g, "\n## ").trim();

  // Tentar dividir por secoes primeiro
  const sections = normalized
    .split(/\n(?=##\s+)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push(section);
    } else {
      // Se a secao for muito grande, dividir com overlap
      let start = 0;
      while (start < section.length) {
        const end = Math.min(start + chunkSize, section.length);
        const chunk = section.slice(start, end).trim();
        if (chunk) {
          chunks.push(chunk);
        }
        if (end === section.length) break;
        start += chunkSize - overlap;
      }
    }
  }

  return chunks.filter(Boolean);
}

/**
 * Gera um ID unico para o chunk
 */
function generateChunkId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  return `${slug}-chunk-${index}`;
}

/**
 * Ingere um documento no sistema RAG
 * @param doc - Documento para ingerir
 * @returns Resultado da ingestao
 */
export async function ingestDocument(doc: IngestDocument): Promise<IngestResult> {
  try {
    if (!doc.content || !doc.title || !doc.category) {
      return {
        success: false,
        chunksCreated: 0,
        error: "title, content e category sao obrigatorios",
      };
    }

    // Pre-processar texto antes do chunking
    const cleanedContent = cleanTextForRAG(doc.content);
    const rawChunks = smartChunk(cleanedContent, CHUNK_SIZE, CHUNK_OVERLAP);
    const chunks = rawChunks.filter(isQualityChunk);

    // Deduplicar chunks por hash
    const seenHashes = new Set<string>();
    const dedupedChunks = chunks.filter((chunk) => {
      const hash = simpleHash(chunk);
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
      return true;
    });

    if (dedupedChunks.length === 0) {
      return {
        success: false,
        chunksCreated: 0,
        error: "Nenhum chunk gerado do conteudo (filtrado por qualidade)",
      };
    }

    let created = 0;

    for (let i = 0; i < dedupedChunks.length; i++) {
      const chunk = dedupedChunks[i];
      const chunkId = generateChunkId(doc.title, i);

      try {
        // Tentar gerar embedding para o chunk
        let embeddingStr: string | null = null;
        try {
          const embedding = await generateEmbedding(chunk);
          embeddingStr = `[${embedding.join(",")}]`;
        } catch (embError) {
          console.warn(`[RAG] Embedding falhou para chunk ${i} (sem creditos?):`, embError instanceof Error ? embError.message : embError);
          // Fallback: salvar documento sem embedding (busca por texto ainda funciona)
        }

        if (embeddingStr) {
          // Inserir com embedding
          await prisma.$executeRawUnsafe(`
            INSERT INTO knowledge_base (id, title, content, category, embedding, source, "sourceUrl", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5::vector, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              embedding = EXCLUDED.embedding,
              "updatedAt" = NOW()
          `, chunkId, `${doc.title} (parte ${i + 1}/${dedupedChunks.length})`, chunk, doc.category, embeddingStr, doc.source || null, doc.sourceUrl || null);
        } else {
          // Inserir sem embedding (fallback)
          await prisma.$executeRawUnsafe(`
            INSERT INTO knowledge_base (id, title, content, category, embedding, source, "sourceUrl", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              "updatedAt" = NOW()
          `, chunkId, `${doc.title} (parte ${i + 1}/${dedupedChunks.length})`, chunk, doc.category, doc.source || null, doc.sourceUrl || null);
        }

        created++;
      } catch (chunkError) {
        console.error(`[RAG] Erro ao processar chunk ${i}:`, chunkError);
        // Continuar com os proximos chunks
      }
    }

    return {
      success: created > 0,
      chunksCreated: created,
      documentId: generateChunkId(doc.title, 0),
    };
  } catch (error) {
    console.error("Erro ao ingerir documento:", error);
    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Ingere multiplos documentos em batch
 * @param docs - Array de documentos
 * @returns Array de resultados
 */
export async function ingestDocuments(docs: IngestDocument[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const doc of docs) {
    const result = await ingestDocument(doc);
    results.push(result);
  }

  return results;
}
