import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const placeholders = [
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
];

const { data, error } = await supabase
  .from('users')
  .select('id,email,agency_id,role')
  .in('agency_id', placeholders)
  .order('email', { ascending: true });

if (error) {
  console.log('PLACEHOLDER_QUERY_ERROR', error.message);
  process.exit(1);
}

console.log('PLACEHOLDER_USERS_COUNT', data.length);
console.log('PLACEHOLDER_USERS', JSON.stringify(data, null, 2));

const { data: agencyRows, error: agencyError } = await supabase
  .from('agencies')
  .select('id,name,slug')
  .in('id', placeholders);

if (agencyError) {
  console.log('PLACEHOLDER_AGENCY_QUERY_ERROR', agencyError.message);
  process.exit(1);
}

console.log('PLACEHOLDER_AGENCIES', JSON.stringify(agencyRows, null, 2));
