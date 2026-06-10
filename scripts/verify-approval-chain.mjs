#!/usr/bin/env node
/**
 * Local chain: approval webhook sign → certificate → lodge → SOS ack → completion gates
 */
import fs from 'node:fs';
import crypto from 'crypto';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.argv[2] || 'http://localhost:3001';
const approvalId = process.argv[3] || '30bd92bd-749d-4959-81de-b17688650690';
const TEST_PASSWORD = 'ImmiSignAudit!2026';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: approval } = await admin
  .from('application_approvals')
  .select('id, signwell_document_id, client_id, agency_id, client_signed_at, certificate_storage_path, lodged_at, status')
  .eq('id', approvalId)
  .single();

if (!approval?.signwell_document_id) {
  console.error('Approval missing signwell_document_id — run send-for-client-approval first');
  process.exit(1);
}

const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || '30f3dca9-feb4-471f-a1a7-7836f4c5c333';
const eventType = 'document_completed';
const time = Math.floor(Date.now() / 1000);
const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
const payload = {
  event: { type: eventType, time, hash },
  data: { object: { id: approval.signwell_document_id } },
};

const whRes = await fetch(`${baseUrl}/api/webhooks/signwell`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const whBody = await whRes.text();
console.log('WEBHOOK', whRes.status, whBody);

await new Promise((r) => setTimeout(r, 3000));

const { data: afterSign } = await admin
  .from('application_approvals')
  .select('client_signed_at, certificate_storage_path, certificate_generated_at, signed_document_path, status')
  .eq('id', approvalId)
  .single();
console.log('AFTER_SIGN', afterSign);

const { data: owner } = await admin.from('users').select('id, email').eq('role', 'owner').limit(1).single();
await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
await page.type('input[type="email"]', owner.email);
await page.type('input[type="password"]', TEST_PASSWORD);
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Continue'))?.click(),
);
await page.waitForFunction(() => /\/workspace\//.test(location.href), { timeout: 60000 });

const clientId = approval.client_id;

const readyRes = await page.evaluate(async (aid) => {
  const r = await fetch(`/api/approvals/${aid}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ready_to_lodge' }),
  });
  const j = await r.json();
  return { status: r.status, j };
}, approvalId);
console.log('READY_TO_LODGE', readyRes);

const lodgeRes = await page.evaluate(async (aid) => {
  const r = await fetch(`/api/approvals/${aid}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lodged' }),
  });
  const j = await r.json();
  return { status: r.status, j };
}, approvalId);
console.log('LODGE', lodgeRes);

const { data: clientAgreements } = await admin
  .from('agreements')
  .select('id, signwell_document_id, status')
  .eq('client_id', clientId)
  .not('signwell_document_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1);

if (clientAgreements?.[0]?.signwell_document_id && clientAgreements[0].status !== 'signed') {
  const saTime = Math.floor(Date.now() / 1000);
  const saHash = crypto.createHmac('sha256', hookId).update(`document_completed@${saTime}`, 'utf8').digest('hex');
  const saWh = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: { type: 'document_completed', time: saTime, hash: saHash },
      data: { object: { id: clientAgreements[0].signwell_document_id } },
    }),
  });
  console.log('SA_WEBHOOK', saWh.status, await saWh.text());
}

const { data: sosList } = await admin.from('service_statements').select('id').eq('client_id', clientId).limit(1);
let sosId = sosList?.[0]?.id;
if (!sosId) {
  const sosCreate = await page.evaluate(async (cid) => {
    const r = await fetch(`/api/clients/${cid}/service-statements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issued_stage: 'during_matter', notes: 'Chain verify SOS' }),
    });
    const j = await r.json();
    return { status: r.status, id: j.statement?.id };
  }, clientId);
  sosId = sosCreate.id;
  console.log('SOS_CREATE', sosCreate);
}

if (sosId) {
  const sosSend = await page.evaluate(async (cid, sid) => {
    const r = await fetch(`/api/clients/${cid}/service-statements/${sid}/send`, { method: 'POST' });
    const j = await r.json();
    return { status: r.status, j };
  }, clientId, sosId);
  console.log('SOS_SEND', sosSend);

  const sosAck = await page.evaluate(async (cid, sid) => {
    const r = await fetch(`/api/clients/${cid}/service-statements/${sid}/acknowledge`, { method: 'POST' });
    const j = await r.json();
    return { status: r.status, j };
  }, clientId, sosId);
  console.log('SOS_ACK', sosAck);
}

const { data: agency } = await admin.from('agencies').select('slug').eq('id', approval.agency_id).single();
await page.goto(`${baseUrl}/workspace/${agency.slug}/clients/${clientId}`, { waitUntil: 'networkidle2' });
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Completion')?.click(),
);
await new Promise((r) => setTimeout(r, 2000));
await page.reload({ waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 2000));
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Completion')?.click(),
);
await new Promise((r) => setTimeout(r, 1500));
const completionUi = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    onTab: text.includes('Completion is computed when all four gates'),
    incomplete: text.includes('Complete remaining workflow steps to close'),
    complete: text.includes('This client matter is complete'),
    overviewComplete: text.includes('Client matter complete — all compliance gates satisfied'),
  };
});
console.log('COMPLETION_UI', completionUi);

const { count: systemNotes } = await admin
  .from('file_notes')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', clientId)
  .eq('note_type', 'system');

const { data: finalApproval } = await admin
  .from('application_approvals')
  .select('lodged_at, client_signed_at, certificate_storage_path')
  .eq('id', approvalId)
  .single();

console.log('FINAL', { finalApproval, systemNotes });

await browser.close();

const eOk = Boolean(afterSign?.client_signed_at);
const fOk = Boolean(afterSign?.certificate_storage_path);
const gOk = Boolean(finalApproval?.lodged_at);
console.log('CHAIN', { E_sign: eOk, F_cert: fOk, G_lodge: gOk, I_ui: completionUi });

process.exit(eOk && fOk && gOk ? 0 : 1);
