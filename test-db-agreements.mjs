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

async function checkAgreementsSchema() {
  const { data, error } = await supabase.from('agreements').select('*').limit(1);
  if (error) {
    console.error('Error fetching agreement:', error);
  } else {
    console.log('Agreements table row keys:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }
}

checkAgreementsSchema();
