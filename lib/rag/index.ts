/**
 * RAG (Retrieval Augmented Generation) System
 * Sistema de busca semantica para enriquecer respostas do LLM
 */

export { generateEmbedding, generateEmbeddings, EMBEDDING_DIMENSION } from "./embeddings";
export { ingestDocument, ingestDocuments, type IngestDocument, type IngestResult } from "./ingest";
export { searchKnowledge, formatContextFromResults, getRAGContext, type SearchResult } from "./search";
