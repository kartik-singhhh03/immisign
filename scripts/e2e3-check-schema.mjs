import { connectPgClient } from './lib/resolve-database-url.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const client = await connectPgClient();
const { rows } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='service_statements' ORDER BY column_name
`);
console.log('service_statements columns:', rows.map((r) => r.column_name).join(', '));
await client.end();

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: agr } = await admin.from('agreements').select('id, status, client_id, client_name').order('created_at', { ascending: false }).limit(3);
console.log('recent agreements:', agr);
