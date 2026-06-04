#!/usr/bin/env node
import fs from 'node:fs';
import pg from 'pg';
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const c = new pg.Client({
  connectionString: resolveDatabaseUrlCandidates(env)[0],
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const pw = await c.query(
  `SELECT webhook_id, event_type, processed_at FROM processed_webhooks ORDER BY processed_at DESC LIMIT 8`,
);
const agr = await c.query(
  `SELECT agreement_number, status, signwell_status, completed_at FROM agreements WHERE signwell_document_id IS NOT NULL ORDER BY updated_at DESC LIMIT 3`,
);
const notif = await c.query(
  `SELECT type, title, created_at, entity_type, entity_id FROM notifications ORDER BY created_at DESC LIMIT 5`,
);
const act = await c.query(
  `SELECT type, title, reference_type, created_at FROM activity_logs WHERE type LIKE '%SignWell%' OR title LIKE '%SignWell%' ORDER BY created_at DESC LIMIT 5`,
);
const inv = await c.query(
  `SELECT email, role, accepted_at, created_at FROM invitations ORDER BY created_at DESC LIMIT 5`,
);

console.log(JSON.stringify({ processed_webhooks: pw.rows, agreements: agr.rows, notifications: notif.rows, signwell_activity: act.rows, invitations: inv.rows }, null, 2));
await c.end();
