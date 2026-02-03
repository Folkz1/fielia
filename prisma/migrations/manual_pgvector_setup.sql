-- Migration: Setup pgvector for RAG
-- Execute este SQL manualmente no banco PostgreSQL se a extensao pgvector estiver disponivel

-- 1. Habilitar extensao pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Alterar coluna embedding para tipo vector(1536)
-- Nota: Se a coluna ja tiver dados Float[], sera necessario converter
-- ALTER TABLE corinthians_knowledge
-- ALTER COLUMN embedding TYPE vector(1536)
-- USING embedding::vector(1536);

-- 3. Criar indice IVFFlat para busca eficiente
-- Nota: So crie o indice apos ter alguns registros na tabela (recomendado > 100)
-- CREATE INDEX idx_knowledge_embedding
-- ON corinthians_knowledge
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Alternativa: Criar tabela auxiliar para RAG (mais flexivel)
CREATE TABLE IF NOT EXISTS rag_knowledge (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    embedding vector(1536),
    source TEXT,
    source_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar indice para busca semantica
-- Usar ivfflat para datasets maiores (> 1000 registros)
-- ou hnsw para datasets menores mas com melhor precisao
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_embedding
ON rag_knowledge
USING hnsw (embedding vector_cosine_ops);

-- Indice para filtro por categoria
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_category
ON rag_knowledge(category);

-- Funcao de busca semantica
CREATE OR REPLACE FUNCTION search_rag_knowledge(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.65,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    content TEXT,
    category TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rk.id,
        rk.title,
        rk.content,
        rk.category,
        1 - (rk.embedding <=> query_embedding) as similarity
    FROM rag_knowledge rk
    WHERE rk.embedding IS NOT NULL
      AND 1 - (rk.embedding <=> query_embedding) > match_threshold
    ORDER BY rk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
