#!/usr/bin/env node
/**
 * Replay one SignWell webhook to local/ngrok endpoint (no SignWell API quota).
 * Usage:
 *   node scripts/phase16-99-webhook-replay.mjs --url https://YOUR.ngrok-free.dev/api/webhooks/signwell --agreement-id <uuid>
 *   SKIP_WEBHOOK_VALIDATION=true node scripts/phase16-99-webhook-replay.mjs ...
 */
import fs from 'node:fs';
import pg from 'pg';
import crypto from 'crypto';
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

function loadEnv() {
  const env = {};
  if (!fs.existsSync('.env.local')) return env;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const args = process.argv.slice(2);
const url =
  args.find((a, i) => args[i - 1] === '--url') ||
  process.env.WEBHOOK_REPLAY_URL ||
  'http://localhost:3000/api/webhooks/signwell';
const agreementId = args.find((a, i) => args[i - 1] === '--agreement-id');
const eventType = args.find((a, i) => args[i - 1] === '--event') || 'document_completed';

const env = loadEnv();
const dbUrl = resolveDatabaseUrlCandidates(env)[0];
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

let signwellDocId = process.env.SIGNWELL_DOC_ID;
if (agreementId) {
  const r = await client.query(
    `SELECT signwell_document_id, agency_id, agreement_number FROM agreements WHERE id = $1`,
    [agreementId],
  );
  signwellDocId = r.rows[0]?.signwell_document_id;
  if (!signwellDocId) {
    console.error('No signwell_document_id on agreement', agreementId);
    process.exit(1);
  }
}

if (!signwellDocId) {
  console.error('Provide --agreement-id <uuid> or SIGNWELL_DOC_ID');
  process.exit(1);
}

const time = Math.floor(Date.now() / 1000);
const webhookId =
  process.env.SIGNWELL_WEBHOOK_ID?.trim() ||
  (process.env.SIGNWELL_WEBHOOK_SECRET?.match(/^[0-9a-f-]{36}$/i)
    ? process.env.SIGNWELL_WEBHOOK_SECRET.trim()
    : '');
let hash = crypto.randomBytes(20).toString('hex');
if (webhookId) {
  hash = crypto.createHmac('sha256', webhookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
}

const payload = {
  event: {
    type: eventType,
    time,
    hash,
    related_signer: { email: 'kartiksingh2829@gmail.com', name: 'Replay Signer' },
  },
  data: {
    object: {
      id: signwellDocId,
      status: eventType === 'document_completed' ? 'Completed' : 'Sent',
      name: 'webhook-replay-test',
    },
  },
};

console.log('POST', url, { eventType, signwellDocId, hash: hash.slice(0, 12) + '…' });
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log('HTTP', res.status, text);

const processed = await client.query(
  `SELECT * FROM processed_webhooks WHERE webhook_id = $1`,
  [hash],
);
console.log('processed_webhooks row:', processed.rows[0] || null);

await client.end();
process.exit(res.ok ? 0 : 1);
