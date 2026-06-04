#!/usr/bin/env node
/**
 * Post-send DB check for latest standalone document in a workspace.
 * Usage: node scripts/phase16-96-send-verify.mjs [workspace-slug]
 */
import fs from 'node:fs';
import pg from 'pg';
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

const slug = process.argv[2] || 'anshu-labs';
const env = loadEnv();
const dbUrl = resolveDatabaseUrlCandidates(env)[0];
if (!dbUrl) {
  console.error('No DATABASE_URL in .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const agency = await client.query(
  `SELECT id, slug FROM agencies WHERE slug = $1 LIMIT 1`,
  [slug],
);
if (!agency.rows[0]) {
  console.error('Agency not found:', slug);
  process.exit(1);
}

const doc = await client.query(
  `SELECT id, file_name, signwell_document_id, signwell_status, signwell_sent_at,
          signwell_dispatch_error, signwell_external_signer_count
   FROM documents
   WHERE agency_id = $1 AND agreement_id IS NULL
   ORDER BY created_at DESC LIMIT 1`,
  [agency.rows[0].id],
);

const activity = doc.rows[0]
  ? await client.query(
      `SELECT COUNT(*)::int AS c FROM activity_logs
       WHERE agency_id = $1 AND reference_id = $2 AND reference_type = 'document'`,
      [agency.rows[0].id, doc.rows[0].id],
    )
  : { rows: [{ c: 0 }] };

const notif = doc.rows[0]
  ? await client.query(
      `SELECT COUNT(*)::int AS c FROM notifications
       WHERE agency_id = $1 AND entity_id = $2`,
      [agency.rows[0].id, doc.rows[0].id],
    )
  : { rows: [{ c: 0 }] };

const pass = Boolean(doc.rows[0]?.signwell_document_id);
console.log(
  JSON.stringify(
    {
      slug,
      pass,
      signwellTestModeEnv: process.env.SIGNWELL_TEST_MODE || env.SIGNWELL_TEST_MODE || '(unset)',
      latestStandaloneDocument: doc.rows[0] || null,
      activityLogCount: activity.rows[0]?.c ?? 0,
      notificationCount: notif.rows[0]?.c ?? 0,
      hint: pass
        ? 'DB OK — confirm SignWell inbox if SIGNWELL_TEST_MODE=false'
        : 'FAIL — run send document flow in browser first',
    },
    null,
    2,
  ),
);

await client.end();
process.exit(pass ? 0 : 1);
