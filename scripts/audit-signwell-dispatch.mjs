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
  .from('agreements')
  .select('id,title,status,signwell_document_id,signwell_status,updated_at')
  .not('signwell_document_id', 'is', null)
  .order('updated_at', { ascending: false })
  .limit(20);

if (error) {
  console.log('SIGNWELL_QUERY_ERROR', error.message);
  process.exit(1);
}

console.log('SIGNWELL_ROWS', JSON.stringify(data, null, 2));
