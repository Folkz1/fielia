import 'dotenv/config';
import { Pool } from 'pg';

const cs = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: cs, ssl: false });

async function check() {
  const client = await pool.connect();
  try {
    const ext = await client.query("SELECT installed_version FROM pg_available_extensions WHERE name = 'vector'");
    console.log('pgvector available:', ext.rows.length > 0 ? ext.rows[0].installed_version || 'avail-not-installed' : 'NOT_AVAILABLE');

    const created = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    console.log('pgvector created:', created.rows.length > 0 ? created.rows[0].extversion : 'NO');

    const col = await client.query("SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'corinthians_knowledge' AND column_name = 'embedding'");
    console.log('embedding type:', col.rows.length > 0 ? col.rows[0].udt_name : 'NOT_FOUND');

    const cnt = await client.query('SELECT count(*) as c FROM corinthians_knowledge');
    console.log('rows:', cnt.rows[0].c);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch((e) => console.error('ERR:', e.message));
