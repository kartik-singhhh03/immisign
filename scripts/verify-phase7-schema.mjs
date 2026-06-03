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
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  'matter_defaults',
  'branding_settings',
  'user_signatures',
  'agreement_wizard_drafts',
  'agreement_reference_counters',
];

const results = {};
for (const table of tables) {
  const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  results[table] = { exists: !error, error: error?.message || null, count: count ?? null };
}

console.log(JSON.stringify({ schema: results }, null, 2));
const missing = Object.entries(results).filter(([, v]) => !v.exists).map(([k]) => k);
if (missing.length) {
  console.error('MISSING_TABLES', missing.join(', '));
  process.exit(1);
}
console.log('SCHEMA_OK');
