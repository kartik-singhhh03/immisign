#!/usr/bin/env node
/**
 * APPLICATION-APPROVAL-FINAL-COMPLIANCE — audit field verification.
 * Usage: node scripts/application-approval-compliance-e2e.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const baseUrl = (argv[0] || 'https://immisign.vercel.app').replace(/\/$/, '');
const agencySlug = argv[1] || 'ritiklabs';
const stamp = Date.now();
const evidenceDir = 'docs/e2e-evidence';
const outPath = path.join(evidenceDir, 'application-approval-compliance.json');

fs.mkdirSync(evidenceDir, { recursive: true });

const evidence = { task: 'APPLICATION-APPROVAL-FINAL-COMPLIANCE', timestamp: new Date().toISOString(), baseUrl, overall: 'PENDING', checks: [] };
const results = [];

function record(id, status, msg, detail = {}) {
  results.push({ id, status, msg, detail });
  evidence.checks.push({ id, status, msg, detail });
  console.log(`${status.padEnd(6)} ${id}: ${msg}`);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getSession() {
  const { data: agency } = await admin.from('agencies').select('id').eq('slug', agencySlug).single();
  const { data: users } = await admin.from('users').select('id, email, role').eq('agency_id', agency.id);
  const user = users?.find((u) => u.role === 'owner') || users?.[0];
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionData } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  return { agency, user, session: sessionData.session };
}

async function main() {
  const { agency, session } = await getSession();
  const token = session.access_token;

  const { data: agreements } = await admin
    .from('agreements')
    .select('id, client_id, clients(id, name, email)')
    .eq('agency_id', agency.id)
    .limit(20);
  const row = agreements?.[0];
  const client = row?.clients;
  if (!client) throw new Error('No test client');

  const { data: matter } = await admin
    .from('matters')
    .select('id, visa_subclass')
    .eq('client_id', client.id)
    .limit(1)
    .maybeSingle();

  const createRes = await fetch(`${baseUrl}/api/application-approvals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: client.id,
      matterId: matter?.id,
      fileSource: 'agreement',
      fileId: row.id,
      matterReference: `COMP-${stamp}`,
      visaSubclass: matter?.visa_subclass || '482',
    }),
  });
  const { approval } = await createRes.json();
  const approvalId = approval.id;
  evidence.approvalId = approvalId;

  const pdfBytes = fs.readFileSync(path.join('scripts', 'fixtures', 'sample.pdf'));
  const form = new FormData();
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), `SC190_ComplianceTest_${stamp}.pdf`);
  await fetch(`${baseUrl}/api/application-approvals/${approvalId}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const sendRes = await fetch(`${baseUrl}/api/application-approvals/${approvalId}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  await sendRes.json().catch(() => ({}));

  const { data: tokenRow } = await admin
    .from('application_approvals')
    .select('approval_token, sent_at, status')
    .eq('id', approvalId)
    .single();
  const approvalToken = tokenRow?.approval_token;
  evidence.approvalToken = approvalToken;
  record('send_status', approvalToken && tokenRow?.status === 'sent' ? 'PASS' : 'FAIL', tokenRow?.status || 'no token');

  await sleep(1500);

  const { data: afterSend } = await admin.from('application_approvals').select('sent_at').eq('id', approvalId).single();
  record('sent_at', afterSend?.sent_at ? 'PASS' : 'FAIL', afterSend?.sent_at || 'missing');

  const { data: sentAudit } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', approvalId)
    .eq('event_type', 'sent')
    .maybeSingle();
  record('audit_sent', sentAudit ? 'PASS' : 'FAIL', sentAudit?.event_timestamp || 'missing');
  record('audit_sent_provider', sentAudit?.provider === 'Resend' ? 'PASS' : 'FAIL', sentAudit?.provider || 'missing');
  record('audit_resend_id', sentAudit?.metadata?.resend_id ? 'PASS' : 'WARN', String(sentAudit?.metadata?.resend_id || 'none'));

  await fetch(`${baseUrl}/api/public/approval/${approvalToken}`);
  await sleep(500);

  const { data: afterView } = await admin.from('application_approvals').select('viewed_at').eq('id', approvalId).single();
  record('viewed_at', afterView?.viewed_at ? 'PASS' : 'FAIL', afterView?.viewed_at || 'missing');

  const { data: viewedAudit } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', approvalId)
    .eq('event_type', 'viewed')
    .maybeSingle();
  record('audit_viewed', viewedAudit ? 'PASS' : 'FAIL', viewedAudit?.event_timestamp || 'missing');

  await fetch(`${baseUrl}/api/public/approval/${approvalToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve', clientName: client.name }),
  });
  await sleep(5000);

  const { data: afterApprove } = await admin
    .from('application_approvals')
    .select('*')
    .eq('id', approvalId)
    .single();
  record('approved_at', afterApprove?.approved_at ? 'PASS' : 'FAIL', afterApprove?.approved_at || 'missing');
  record('filename', afterApprove?.application_file_name?.includes('ComplianceTest') ? 'PASS' : 'FAIL', afterApprove?.application_file_name);

  const { data: audits } = await admin
    .from('document_audit_events')
    .select('*')
    .eq('document_id', approvalId);
  const signed = audits?.find((a) => a.event_type === 'signed');
  const ack = audits?.find((a) => a.event_type === 'acknowledged');
  const generated = audits?.find((a) => a.event_type === 'generated');
  record('audit_signed', signed?.provider === 'Immimate Approval Portal' ? 'PASS' : 'FAIL', signed?.provider);
  record('audit_acknowledged', ack ? 'PASS' : 'FAIL', ack?.event_timestamp || 'missing');
  record('audit_generated', generated ? 'PASS' : 'WARN', generated?.event_timestamp || 'missing');
  record('audit_filename_meta', signed?.metadata?.original_filename ? 'PASS' : 'FAIL', signed?.metadata?.original_filename);

  const { data: note } = await admin
    .from('file_notes')
    .select('body')
    .eq('reference_id', approvalId)
    .eq('is_system_note', true)
    .limit(1)
    .maybeSingle();
  record('file_note', note?.body?.includes('Attached File:') ? 'PASS' : 'FAIL', note?.body?.slice(0, 80));

  const auditApi = await fetch(`${baseUrl}/api/clients/${client.id}/audit-events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const auditJson = await auditApi.json();
  const cardEvents = (auditJson.events || []).filter((e) => e.document_id === approvalId);
  const enrichedSent = cardEvents.find((e) => e.event_type === 'sent');
  const expectedProvider = (e) => {
    if (e.event_type === 'sent') return 'Resend';
    if (e.event_type === 'completed' && e.metadata?.action === 'agent_notified') return 'Resend';
    return 'Immimate Approval Portal';
  };
  const badProviders = cardEvents.filter((e) => e.provider !== expectedProvider(e));
  const enrichedProvider = badProviders.length === 0;
  record('audit_api_sent', enrichedSent ? 'PASS' : 'FAIL', enrichedSent?.event_timestamp);
  record(
    'audit_api_provider',
    enrichedProvider ? 'PASS' : 'FAIL',
    enrichedProvider
      ? 'sent=Resend, agent_notified=Resend, others=Immimate Approval Portal'
      : badProviders.map((e) => `${e.event_type}:${e.provider}`).join(', '),
  );

  const recordDl = await fetch(`${baseUrl}/api/application-approvals/${approvalId}/record`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
  });
  record('approval_record_download', recordDl.status === 307 || recordDl.status === 302 ? 'PASS' : 'FAIL', `HTTP ${recordDl.status}`);

  const fails = results.filter((r) => r.status === 'FAIL');
  evidence.overall = fails.length === 0 ? 'PASS' : 'FAIL';
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(`\nOverall: ${evidence.overall} (${fails.length} failures)`);
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
