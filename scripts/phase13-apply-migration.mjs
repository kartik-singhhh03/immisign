#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { connectPgClient } from './lib/resolve-database-url.mjs';

const name = '20260605100000_phase13_notifications_comms.sql';
const sql = fs.readFileSync(path.join('supabase', 'migrations', name), 'utf8');

const client = await connectPgClient();
await client.query(`
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  );
`);
const { rows } = await client.query('SELECT 1 FROM public.schema_migrations WHERE filename = $1', [name]);
if (rows.length) {
  console.log('SKIP', name);
} else {
  console.log('APPLY', name);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log('OK', name);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  }
}
await client.end();
