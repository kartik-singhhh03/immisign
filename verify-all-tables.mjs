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

async function verifyAllTables() {
  const tables = [
    'agencies', 'users', 'rmas', 'agreements', 'agreement_participants',
    'documents', 'signers', 'signatures', 'audit_logs', 'subscriptions',
    'clients', 'templates', 'approvals', 'application_approvals',
    'signwell_templates', 'signwell_documents', 'matter_types',
    'payment_schedules', 'agreement_clauses', 'activity_logs'
  ];
  
  console.log('--- TABLE AUDIT ---');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`[MISSING/ERROR] ${table}: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`[OK] ${table} exists (Count: ${count})`);
      }
    } catch (err) {
      console.log(`[EXCEPTION] ${table}: ${err.message}`);
    }
  }
}

verifyAllTables();
