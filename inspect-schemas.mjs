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

async function inspectSchemas() {
  const { data: agCols, error: agErr } = await supabase
    .from('agreements')
    .select('*')
    .limit(1);
    
  console.log('=== AGREEMENTS SAMPLE ===');
  if (agErr) console.error('agreements table error:', agErr.message);
  else console.log(agCols);
}

inspectSchemas();
