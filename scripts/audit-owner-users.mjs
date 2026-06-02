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

const { data, error } = await supabase
  .from('users')
  .select('id,email,agency_id,role')
  .eq('role', 'owner')
  .order('email', { ascending: true });

if (error) {
  console.log('OWNER_QUERY_ERROR', error.message);
  process.exit(1);
}

console.log('OWNER_USERS', JSON.stringify(data, null, 2));
