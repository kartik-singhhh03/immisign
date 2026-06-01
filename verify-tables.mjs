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

async function verifyTables() {
  const tables = [
    'agencies', 'users', 'clients', 'agreements', 'documents',
    'application_approvals', 'activity_logs', 'matter_types',
    'payment_schedules', 'agreement_clauses', 'profiles'
  ];
  
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[ERROR] ${table}: ${error.message}`);
    } else {
      console.log(`[OK] ${table} exists (Count: ${count})`);
    }
  }
}

verifyTables();
