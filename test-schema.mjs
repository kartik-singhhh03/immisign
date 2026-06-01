import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) {
    let val = match[2];
    if (val.endsWith('"')) val = val.slice(0, -1);
    process.env[match[1]] = val;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function testQuery() {
  console.log("Querying information_schema...");
  const { data, error } = await supabase.from('information_schema.tables').select('*').eq('table_schema', 'public');
  if (error) {
    console.log("Error querying information_schema:", error.message);
  } else {
    console.log("Success! Found tables:", data?.length);
  }
  
  // Try querying just any table like agencies to see if the PostgREST introspection works
  const { data: d2, error: e2 } = await supabase.from('agencies').select('id').limit(1);
  if (e2) console.log("Error querying agencies:", e2.message);
  else console.log("Agencies table exists.");
}

testQuery();
