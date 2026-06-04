#!/usr/bin/env node
import fs from 'node:fs';
import pg from 'pg';
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs';

const slug = process.argv[2] || 'anshu-labs';
const env = {};
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
}

const url = resolveDatabaseUrlCandidates(env)[0];
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const agency = await client.query(`SELECT id, slug FROM agencies WHERE slug = $1`, [slug]);
const aid = agency.rows[0]?.id;
if (!aid) {
  console.error('Agency not found');
  process.exit(1);
}

const standalone = await client.query(
  `SELECT id, file_name, created_at, signwell_document_id, signwell_status,
          signwell_dispatch_error, signwell_sent_at, signwell_external_signer_count,
          sender_attestation_path, file_url, agency_id
   FROM documents WHERE agency_id = $1 AND agreement_id IS NULL
   ORDER BY created_at DESC LIMIT 3`,
  [aid],
);

const latest = standalone.rows[0];
let activityCount = 0;
let notificationCount = 0;
if (latest) {
  const a = await client.query(
    `SELECT COUNT(*)::int c FROM activity_logs WHERE reference_id = $1 AND reference_type = 'document'`,
    [latest.id],
  );
  const n = await client.query(
    `SELECT COUNT(*)::int c FROM notifications WHERE entity_id = $1`,
    [latest.id],
  );
  activityCount = a.rows[0]?.c ?? 0;
  notificationCount = n.rows[0]?.c ?? 0;
}

console.log(
  JSON.stringify(
    {
      agency: agency.rows[0],
      standaloneDocuments: standalone.rows,
      latestStandalone: latest
        ? {
            ...latest,
            activityLogCount: activityCount,
            notificationCount,
            sendLegitimate: Boolean(latest.signwell_document_id),
          }
        : null,
    },
    null,
    2,
  ),
);

await client.end();
