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

async function testSelectById() {
  const { data, error } = await supabase
    .from('agreements')
    .select('*, payment_schedules(total_amount)')
    .eq('id', '210a5b06-2424-4969-b0dc-7ae23cc90ba4')
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Agreement row:', JSON.stringify(data, null, 2));
  }
}

testSelectById();
