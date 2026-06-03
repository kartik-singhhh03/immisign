import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const local = fs
  .readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort();

const { data: applied, error } = await supabase
  .from('schema_migrations')
  .select('filename, applied_at')
  .order('filename');

if (error) {
  console.error('schema_migrations error:', error.message);
  process.exit(1);
}

const appliedSet = new Set((applied || []).map((r) => r.filename));
const pending = local.filter((f) => !appliedSet.has(f));

console.log('LOCAL', local.length);
console.log('APPLIED', applied?.length ?? 0);
console.log('\n--- Applied ---');
for (const r of applied || []) console.log(r.filename);
console.log('\n--- Pending ---');
for (const f of pending) console.log(f);
if (pending.length === 0) console.log('(none)');
