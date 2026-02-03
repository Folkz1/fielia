/**
 * Servico de geracao de embeddings para RAG
 * Usa OpenRouter API com modelo text-embedding-3-small
 */

const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Gera embedding para um texto usando a API do OpenRouter
 * @param text - Texto para gerar embedding
 * @returns Vetor de embedding (1536 dimensoes)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY nao configurada");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "FIEL.IA RAG",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro ao gerar embedding:", errorText);
      throw new Error(`Falha ao gerar embedding: ${response.status}`);
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("Resposta de embedding vazia");
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("Erro ao chamar API de embeddings:", error);
    throw error;
  }
}

/**
 * Gera embeddings para multiplos textos em batch
 * @param texts - Array de textos
 * @returns Array de vetores de embedding
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Para economizar chamadas, processamos em batch quando possivel
  // Mas a API do OpenRouter pode ter limites, entao processamos um por um para seguranca
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}
