#!/usr/bin/env node
import { connectPgClient } from './lib/resolve-database-url.mjs';

const client = await connectPgClient();
const tables = ['agency_tasks', 'user_notification_preferences'];
for (const t of tables) {
  const { rows } = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS ok`,
    [t],
  );
  console.log(t, rows[0].ok ? 'EXISTS' : 'MISSING');
}
const { rows: mig } = await client.query(
  `SELECT filename FROM public.schema_migrations WHERE filename LIKE '%phase13%'`,
);
console.log('phase13 migrations:', mig.map((r) => r.filename));
await client.end();
