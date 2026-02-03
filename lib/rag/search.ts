/**
 * Servico de busca semantica para RAG
 * Usa pgvector para busca por similaridade de cosseno
 */

import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "./embeddings";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

/**
 * Busca conhecimento semanticamente similar a query
 * @param query - Texto da query do usuario
 * @param limit - Numero maximo de resultados
 * @param similarityThreshold - Threshold minimo de similaridade (0-1)
 * @returns Array de resultados ordenados por similaridade
 */
export async function searchKnowledge(
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.65
): Promise<SearchResult[]> {
  try {
    // Gerar embedding da query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Busca por similaridade de cosseno usando pgvector
    // Nota: <=> e o operador de distancia de cosseno, 1 - distancia = similaridade
    const results = await prisma.$queryRawUnsafe<SearchResult[]>(`
      SELECT
        id,
        title,
        content,
        category,
        1 - (embedding <=> $1::vector) as similarity
      FROM corinthians_knowledge
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) > $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, embeddingStr, similarityThreshold, limit);

    return results;
  } catch (error) {
    console.error("Erro na busca semantica:", error);
    // Retornar array vazio em caso de erro para nao quebrar o fluxo
    return [];
  }
}

/**
 * Formata os resultados da busca em contexto para o LLM
 * @param results - Resultados da busca
 * @returns String formatada para injetar no prompt
 */
export function formatContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) return "";

  return results
    .map((r) => `[${r.category.toUpperCase()}] ${r.content}`)
    .join("\n\n---\n\n");
}

/**
 * Busca e formata contexto em uma unica chamada
 * @param query - Query do usuario
 * @param limit - Numero maximo de resultados
 * @returns Contexto formatado ou string vazia
 */
export async function getRAGContext(query: string, limit: number = 3): Promise<string> {
  const results = await searchKnowledge(query, limit);
  return formatContextFromResults(results);
}
