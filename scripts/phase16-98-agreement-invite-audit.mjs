#!/usr/bin/env node
/**
 * Phase 16.98 — Agreement + Invite DB/API evidence (not browser PASS).
 * Usage: node scripts/phase16-98-agreement-invite-audit.mjs [slug1] [slug2...]
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

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ['anshu-labs', 'avc-migration-live', 'abc-lab'];
const env = loadEnv();
const url = resolveDatabaseUrlCandidates(env)[0];
if (!url) {
  console.error('No DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const report = { timestamp: new Date().toISOString(), workspaces: [] };

for (const slug of slugs) {
  const agency = await client.query(
    `SELECT id, slug, name, created_at FROM agencies WHERE slug = $1 OR slug ILIKE $2 LIMIT 1`,
    [slug, slug.replace(/-/g, ' ')],
  );
  if (!agency.rows[0]) {
    report.workspaces.push({ slug, found: false });
    continue;
  }
  const aid = agency.rows[0].id;

  const agreements = await client.query(
    `SELECT id, agreement_number, status, signwell_document_id, signwell_status,
            client_name, client_email, created_at, updated_at
     FROM agreements WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [aid],
  );

  const agreementIds = agreements.rows.map((r) => r.id);
  let agreementDocs = [];
  if (agreementIds.length) {
    const d = await client.query(
      `SELECT id, agreement_id, file_name, signwell_document_id, signwell_status, created_at
       FROM documents WHERE agreement_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [agreementIds],
    );
    agreementDocs = d.rows;
  }

  const invites = await client.query(
    `SELECT id, email, role, token, expires_at, accepted_at, created_at, created_by, full_name
     FROM invitations WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 15`,
    [aid],
  );

  const users = await client.query(
    `SELECT id, email, full_name, role, is_active, created_at FROM users
     WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [aid],
  );

  const webhooks = await client.query(
    `SELECT webhook_id, processed_at FROM processed_webhooks
     ORDER BY processed_at DESC LIMIT 10`,
  );

  const recentActivity = await client.query(
    `SELECT type, title, reference_type, reference_id, created_at
     FROM activity_logs WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 15`,
    [aid],
  );

  const pendingInvites = invites.rows.filter((i) => !i.accepted_at);
  const acceptedInvites = invites.rows.filter((i) => i.accepted_at);
  const orphanInvites = [];
  for (const inv of acceptedInvites) {
    const u = users.rows.find((x) => x.email?.toLowerCase() === inv.email?.toLowerCase());
    if (!u) orphanInvites.push({ invite: inv.email, reason: 'accepted but no users row' });
  }

  const duplicateEmails = users.rows.reduce((acc, u) => {
    const e = (u.email || '').toLowerCase();
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});
  const dupUsers = Object.entries(duplicateEmails).filter(([, c]) => c > 1);

  report.workspaces.push({
    slug,
    found: true,
    agency: agency.rows[0],
    agreements: agreements.rows,
    agreementDocuments: agreementDocs,
    invitations: {
      total: invites.rows.length,
      pending: pendingInvites.length,
      accepted: acceptedInvites.length,
      rows: invites.rows,
    },
    users: { count: users.rows.length, rows: users.rows },
    integrity: {
      orphanAcceptedInvites: orphanInvites,
      duplicateUserEmails: dupUsers,
    },
    recentActivity: recentActivity.rows,
    processedWebhooksSample: webhooks.rows,
    agreementSendDbPass: agreements.rows.some((a) => a.signwell_document_id),
  });
}

console.log(JSON.stringify(report, null, 2));
await client.end();
