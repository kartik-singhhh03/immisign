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

async function testSelectLogs() {
  const { data: auditCols, error: err1 } = await supabase.from('audit_logs').select('*').limit(1);
  console.log('audit_logs columns:', auditCols ? Object.keys(auditCols[0] || {}) : 'Error or empty');
  
  const { data: activityCols, error: err2 } = await supabase.from('activity_logs').select('*').limit(1);
  console.log('activity_logs columns:', activityCols ? Object.keys(activityCols[0] || {}) : 'Error or empty');
}

testSelectLogs();
