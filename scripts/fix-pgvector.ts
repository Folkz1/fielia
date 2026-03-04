/**
 * Script para corrigir a coluna embedding e criar indice HNSW
 * Executa: npx tsx scripts/fix-pgvector.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

const cs = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: cs, ssl: cs.includes('sslmode=disable') ? false : { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    // 1. Verificar estado atual
    const ext = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    if (ext.rows.length === 0) {
      console.log('[FIX] pgvector nao esta instalado. Criando extensao...');
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('[FIX] pgvector instalado.');
    } else {
      console.log(`[FIX] pgvector v${ext.rows[0].extversion} ja instalado.`);
    }

    // 2. Verificar tipo atual da coluna embedding
    const col = await client.query(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'embedding'"
    );
    const currentType = col.rows[0]?.udt_name || 'NOT_FOUND';
    console.log(`[FIX] Tipo atual da coluna embedding: ${currentType}`);

    if (currentType === 'vector') {
      console.log('[FIX] Coluna ja e vector. Pulando ALTER.');
    } else if (currentType === '_float8' || currentType === 'float8') {
      // Fix 1: Alterar tipo da coluna
      console.log('[FIX] Alterando coluna embedding para vector(1536)...');

      // Primeiro, limpar embeddings invalidos (null ou vazios)
      await client.query(`
        UPDATE knowledge_base
        SET embedding = NULL
        WHERE embedding IS NOT NULL AND array_length(embedding, 1) != 1536
      `);

      await client.query(`
        ALTER TABLE knowledge_base
        ALTER COLUMN embedding TYPE vector(1536)
        USING embedding::vector(1536)
      `);
      console.log('[FIX] Coluna alterada para vector(1536).');
    } else {
      console.log(`[FIX] Tipo inesperado: ${currentType}. Tentando alterar...`);
      try {
        await client.query(`
          ALTER TABLE knowledge_base
          ALTER COLUMN embedding TYPE vector(1536)
          USING CASE WHEN embedding IS NULL THEN NULL ELSE embedding::vector(1536) END
        `);
        console.log('[FIX] Coluna alterada para vector(1536).');
      } catch (e: any) {
        console.error('[FIX] Falha ao alterar coluna:', e.message);
        // Fallback: dropar e recriar a coluna
        console.log('[FIX] Tentando dropar e recriar coluna...');
        await client.query('ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding');
        await client.query('ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536)');
        console.log('[FIX] Coluna recriada como vector(1536).');
      }
    }

    // Fix 3: Criar indice HNSW
    console.log('[FIX] Criando indice HNSW...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ck_embedding_hnsw
      ON knowledge_base
      USING hnsw (embedding vector_cosine_ops)
    `);
    console.log('[FIX] Indice HNSW criado.');

    // Verificacao final
    const finalCol = await client.query(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'embedding'"
    );
    const cnt = await client.query('SELECT count(*) as c FROM knowledge_base');
    const withEmb = await client.query('SELECT count(*) as c FROM knowledge_base WHERE embedding IS NOT NULL');

    console.log('\n=== RESULTADO ===');
    console.log(`Tipo coluna embedding: ${finalCol.rows[0]?.udt_name}`);
    console.log(`Total documentos: ${cnt.rows[0].c}`);
    console.log(`Com embedding: ${withEmb.rows[0].c}`);
    console.log('=================');
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch((e) => {
  console.error('[FIX] ERRO FATAL:', e.message);
  process.exit(1);
});
