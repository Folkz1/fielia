import 'dotenv/config';
import { Pool } from 'pg';

const cs = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: cs, ssl: false });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('=== Migrating Knowledge Base ===\n');

    // Check if table was already renamed
    const tableCheck = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('corinthians_knowledge', 'knowledge_base')"
    );
    const tables = tableCheck.rows.map(r => r.tablename);
    console.log('Existing tables:', tables.join(', '));

    // 1. Rename table if needed
    if (tables.includes('corinthians_knowledge') && !tables.includes('knowledge_base')) {
      console.log('\n1. Renaming corinthians_knowledge -> knowledge_base...');
      await client.query('ALTER TABLE corinthians_knowledge RENAME TO knowledge_base');
      console.log('   OK');
    } else if (tables.includes('knowledge_base')) {
      console.log('\n1. Table already named knowledge_base, skipping');
    } else {
      console.log('\n1. ERROR: No knowledge table found!');
      return;
    }

    // 2. Add tenant column
    console.log('\n2. Adding tenant column...');
    const tenantCol = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'tenant'"
    );
    if (tenantCol.rows.length === 0) {
      await client.query("ALTER TABLE knowledge_base ADD COLUMN tenant TEXT NOT NULL DEFAULT 'fiel-ia'");
      console.log('   Added');
    } else {
      console.log('   Already exists');
    }

    // 3. Check embedding column type
    console.log('\n3. Checking embedding column...');
    const colType = await client.query(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'embedding'"
    );
    const currentType = colType.rows[0]?.udt_name;
    console.log(`   Current type: ${currentType}`);

    if (currentType === 'vector') {
      console.log('   Already vector type - perfect!');
    } else if (currentType === '_float8') {
      console.log('   Converting float8[] to vector(1536)...');
      try {
        await client.query(`
          UPDATE knowledge_base SET embedding = NULL
          WHERE embedding IS NOT NULL
            AND (array_length(embedding, 1) IS NULL OR array_length(embedding, 1) != 1536)
        `);
        await client.query(`
          ALTER TABLE knowledge_base
          ALTER COLUMN embedding TYPE vector(1536)
          USING CASE WHEN embedding IS NOT NULL THEN embedding::vector(1536) ELSE NULL END
        `);
        console.log('   Converted!');
      } catch {
        console.log('   Direct conversion failed, dropping and recreating...');
        await client.query('ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding');
        await client.query('ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536)');
        console.log('   Recreated as vector(1536)');
      }
    } else {
      console.log(`   Unknown type: ${currentType}, adding column...`);
      await client.query('ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(1536)');
    }

    // 4. Create HNSW index
    console.log('\n4. Creating HNSW index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_embedding_hnsw
      ON knowledge_base USING hnsw (embedding vector_cosine_ops)
    `);
    console.log('   OK');

    // 5. Create tenant index
    console.log('\n5. Creating tenant index...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kb_tenant ON knowledge_base (tenant)');
    console.log('   OK');

    // 6. Verify
    console.log('\n=== Verification ===');
    const verify = await client.query(
      "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'knowledge_base' ORDER BY ordinal_position"
    );
    console.log('Columns:', verify.rows.map(r => `${r.column_name}(${r.udt_name})`).join(', '));

    const cnt = await client.query('SELECT count(*) as c FROM knowledge_base');
    console.log(`Total rows: ${cnt.rows[0].c}`);

    const withEmb = await client.query('SELECT count(*) as c FROM knowledge_base WHERE embedding IS NOT NULL');
    console.log(`With embeddings: ${withEmb.rows[0].c}`);

    console.log('\n=== Migration Complete ===');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
