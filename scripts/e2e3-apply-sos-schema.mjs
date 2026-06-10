import fs from 'fs';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const sql = fs.readFileSync('supabase/migrations/20260611130000_sos_module_complete.sql', 'utf8');
const client = await connectPgClient();
try {
  await client.query(sql);
  console.log('SOS_SCHEMA_APPLIED');
} catch (e) {
  console.error('FAILED', e.message);
  process.exit(1);
} finally {
  await client.end();
}
