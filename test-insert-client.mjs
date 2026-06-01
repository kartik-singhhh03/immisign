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

async function testInsert() {
  const email = 'testowner_1780228890060@demoagency.com';
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*, agencies(*)')
    .eq('email', email)
    .single();

  if (userError) {
    console.error('❌ User query failed:', userError);
  } else {
    console.log('✅ User found:', user);
  }
}

testInsert();
