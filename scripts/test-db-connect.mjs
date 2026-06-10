import pg from 'pg';
import { loadEnvFromFiles, resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

const env = loadEnvFromFiles();
const candidates = resolveDatabaseUrlCandidates(env);
console.log('Candidates:', candidates.length);

for (const u of candidates) {
  const host = u.includes('@') ? u.split('@')[1].split('/')[0] : u;
  const client = new pg.Client({ connectionString: u, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`);
    console.log('OK', host, 'tables=', r.rows[0].n);
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log('FAIL', host, e.message);
    try { await client.end(); } catch {}
  }
}
process.exit(1);
