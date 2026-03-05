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

  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          input: text.slice(0, 8000),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        console.error(`[Embedding] HTTP ${status}:`, errorText);
        if ((status === 429 || status >= 500) && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Falha ao gerar embedding: HTTP ${status} - ${errorText.slice(0, 200)}`);
      }

      const raw = await response.text();
      let data: EmbeddingResponse;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("[Embedding] Resposta nao-JSON:", raw.slice(0, 500));
        throw new Error(`Resposta invalida do OpenRouter (nao-JSON)`);
      }

      if (!data.data || data.data.length === 0 || !data.data[0]?.embedding) {
        console.error("[Embedding] Resposta sem dados:", JSON.stringify(data).slice(0, 500));
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Resposta de embedding vazia (modelo: ${EMBEDDING_MODEL})`);
      }

      return data.data[0].embedding;
    } catch (error) {
      if (attempt < maxRetries && error instanceof TypeError) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      console.error("[Embedding] Erro:", error);
      throw error;
    }
  }

  throw new Error("Embedding falhou apos todas tentativas");
}

/**
 * Gera embeddings para multiplos textos em batch
 * @param texts - Array de textos
 * @returns Array de vetores de embedding
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const delayMs = Math.max(0, Number.parseInt(process.env.EMBEDDING_DELAY_MS || '200', 10) || 200);

  for (let i = 0; i < texts.length; i++) {
    const embedding = await generateEmbedding(texts[i]);
    embeddings.push(embedding);
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return embeddings;
}
