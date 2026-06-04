#!/usr/bin/env node
/**
 * Phase 16.9 workflow integrity — DB + schema checks (not browser PASS).
 * Usage: node scripts/phase16-9-workflow-audit.mjs [workspace-slug]
 */
import fs from 'node:fs';
import path from 'node:path';
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
const outDir = path.join('docs', 'verification-screenshots', 'phase16-9');
const report = {
  timestamp: new Date().toISOString(),
  workspaceSlug: slug,
  schema: {},
  data: {},
  signwellEnv: {
    SIGNWELL_TEST_MODE: process.env.SIGNWELL_TEST_MODE || '(unset)',
    NODE_ENV: process.env.NODE_ENV || '(unset)',
  },
};

const env = loadEnv();
const dbUrl = resolveDatabaseUrlCandidates(env)[0];
if (!dbUrl) {
  console.error('No DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const cols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'documents'
    AND column_name IN (
      'signwell_document_id','signwell_status','signwell_dispatch_error',
      'sender_attestation_path','signwell_signing_links'
    )
  ORDER BY column_name
`);
report.schema.documentColumns = cols.rows.map((r) => r.column_name);

const agency = await client.query(
  `SELECT id, slug, name FROM agencies WHERE slug = $1 OR slug ILIKE $2 LIMIT 1`,
  [slug, slug.replace(/-/g, ' ')],
);
report.data.agency = agency.rows[0] || null;

if (agency.rows[0]) {
  const aid = agency.rows[0].id;
  const docs = await client.query(
    `SELECT id, file_name, signwell_document_id, signwell_status, signwell_sent_at,
            signwell_dispatch_error, signwell_external_signer_count,
            sender_attestation_path, created_at
     FROM documents WHERE agency_id = $1
     ORDER BY created_at DESC LIMIT 8`,
    [aid],
  );
  report.data.recentDocuments = docs.rows;

  const ags = await client.query(
    `SELECT id, agreement_number, status, signwell_document_id, client_name, created_at
     FROM agreements WHERE agency_id = $1
     ORDER BY created_at DESC LIMIT 8`,
    [aid],
  );
  report.data.recentAgreements = ags.rows;

  const clients = await client.query(
    `SELECT id, name, email FROM clients WHERE agency_id = $1 LIMIT 5`,
    [aid],
  );
  report.data.sampleClients = clients.rows;
}

const drafts = await client.query(
  `SELECT agency_id, user_id, current_step, updated_at,
          (draft_data->>'currentStep')::int AS draft_step
   FROM send_document_drafts ORDER BY updated_at DESC LIMIT 5`,
);
report.data.sendDocumentDrafts = drafts.rows;

await client.end();

fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'workflow-audit.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('Wrote', outPath);
console.log(JSON.stringify(report, null, 2));
