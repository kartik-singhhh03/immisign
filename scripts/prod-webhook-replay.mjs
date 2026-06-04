#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'crypto';
import pg from 'pg';
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

const base = process.argv[2] || 'https://immisign.vercel.app';
const env = {};
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    env[line.slice(0, i).trim()] = v;
  }
}

const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || '30f3dca9-feb4-471f-a1a7-7836f4c5c333';
const client = new pg.Client({
  connectionString: resolveDatabaseUrlCandidates(env)[0],
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const r = await client.query(
  `SELECT id, signwell_document_id, status FROM agreements WHERE signwell_document_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
);
const row = r.rows[0];
if (!row?.signwell_document_id) {
  console.error('No agreement with signwell_document_id');
  process.exit(1);
}

const eventType = process.argv[3] || 'document_viewed';
const time = Math.floor(Date.now() / 1000);
const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
const payload = {
  event: { type: eventType, time, hash },
  data: { object: { id: row.signwell_document_id } },
};

const url = `${base.replace(/\/$/, '')}/api/webhooks/signwell`;
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const text = await res.text();
console.log({ url, status: res.status, body: text, agreementId: row.id, signwellDoc: row.signwell_document_id });

const pw = await client.query(`SELECT * FROM processed_webhooks WHERE webhook_id = $1`, [hash]);
console.log('processed_webhooks:', pw.rows[0] || null);
const a = await client.query(`SELECT status, signwell_status FROM agreements WHERE id = $1`, [row.id]);
console.log('agreement:', a.rows[0]);
await client.end();
