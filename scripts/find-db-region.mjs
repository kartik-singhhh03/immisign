import pg from 'pg';
import { loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const env = loadEnvFromFiles();
const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD || '');
const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
if (!ref || !password) { console.error('missing creds'); process.exit(1); }

const regions = [
  'ap-southeast-2', 'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
  'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1',
];

const urls = [
  `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres:${password}@db.${ref}.supabase.co:6543/postgres`,
];
for (const region of regions) {
  urls.push(`postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`);
  urls.push(`postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`);
  urls.push(`postgresql://postgres.${ref}:${password}@aws-1-${region}.pooler.supabase.com:5432/postgres`);
}

for (const u of urls) {
  const host = u.split('@')[1]?.split('/')[0] || u;
  const client = new pg.Client({ connectionString: u, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database(), version()');
    console.log('SUCCESS', host);
    console.log(r.rows[0]);
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log('fail', host, String(e.message).slice(0, 80));
    try { await client.end(); } catch {}
  }
}
process.exit(1);
