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
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      agency_id: '1cd4007e-bbe1-4205-9481-233e2fe90ee7',
      user_id: '35429e46-2966-416d-b8ff-c7e31613b7a6',
      type: 'agreement',
      title: 'Agreement Created',
      description: 'An agreement for Gurpreet Singh has been generated.'
    })
    .select();
    
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Successfully inserted row:', JSON.stringify(data, null, 2));
  }
}

testInsert();
