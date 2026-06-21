#!/usr/bin/env node
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { connectPgClient } from './lib/resolve-database-url.mjs';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { error: probeErr } = await admin
    .from('application_approvals')
    .select('approval_record_storage_path')
    .limit(1);

  if (!probeErr) {
    console.log('PASS: approval_record_storage_path already exists');
    return;
  }

  console.log('Column missing, applying migration...', probeErr.message);

  try {
    const pg = await connectPgClient();
    await pg.query(`
      ALTER TABLE public.application_approvals
        ADD COLUMN IF NOT EXISTS approval_record_storage_path TEXT;
    `);
    await pg.end();
    console.log('PASS: migration applied via Postgres');
  } catch (e) {
    console.error('FAIL: could not apply migration', e.message);
    process.exit(1);
  }
}

main();
