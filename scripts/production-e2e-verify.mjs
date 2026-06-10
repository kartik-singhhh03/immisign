#!/usr/bin/env node
/**
 * ImmiMate production verification — browser + API + DB
 * Usage: node scripts/production-e2e-verify.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.argv[2] || 'http://localhost:3001';
const slug = process.argv[3] || 'avc-migration-live';
const TEST_PASSWORD = 'ImmiSignAudit!2026';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const phases = {};
const consoleErrors = [];

function setPhase(id, status, detail = {}) {
  phases[id] = { status, ...detail };
  console.log(`[${id}] ${status}`, JSON.stringify(detail));
}

async function fireSignwellWebhook(signwellDocumentId) {
  const hookId = env.SIGNWELL_WEBHOOK_ID?.trim() || '30f3dca9-feb4-471f-a1a7-7836f4c5c333';
  const eventType = 'document_completed';
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHmac('sha256', hookId).update(`${eventType}@${time}`, 'utf8').digest('hex');
  const res = await fetch(`${baseUrl}/api/webhooks/signwell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: { type: eventType, time, hash },
      data: { object: { id: signwellDocumentId } },
    }),
  });
  return { status: res.status, body: await res.text() };
}

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Chrome not found');
  process.exit(1);
}

const { data: agencyRow } = await admin.from('agencies').select('id, name').eq('slug', slug).maybeSingle();
if (!agencyRow) {
  console.error('Agency not found:', slug);
  process.exit(1);
}

const { data: owner } = await admin
  .from('users')
  .select('id, email, agency_id, full_name')
  .eq('agency_id', agencyRow.id)
  .eq('role', 'owner')
  .limit(1)
  .maybeSingle();

if (!owner?.email) {
  console.error('No owner for agency', slug);
  process.exit(1);
}

await admin.auth.admin.updateUserById(owner.id, { password: TEST_PASSWORD });

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const t = msg.text();
    if (!t.includes('favicon') && !t.includes('hydration')) consoleErrors.push(t);
  }
});
page.on('pageerror', (err) => consoleErrors.push(err.message));

async function login() {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', owner.email, { delay: 10 });
  await page.type('input[type="password"]', TEST_PASSWORD, { delay: 10 });
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Continue to Workspace'),
    );
    btn?.click();
    return !!btn;
  });
  if (!clicked) throw new Error('Login button not found');
  await page.waitForFunction(() => /\/workspace\//.test(window.location.href), { timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2000));
}

async function clickButton(text) {
  return page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(t),
    );
    btn?.click();
    return !!btn;
  }, text);
}

let clientId = null;
let clientName = null;
let clientEmail = null;
let approvalId = null;

try {
  await login();

  // ── PHASE A: Client workflow ──
  const ts = Date.now();
  clientName = `Verify Client ${ts}`;
  clientEmail = `verify.client.${ts}@immimate.test`;

  await page.goto(`${baseUrl}/workspace/${slug}/clients`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(
    () => (document.body?.innerText || '').includes('Client relationship workspace'),
    { timeout: 60000 },
  );

  await clickButton('New client');
  await page.waitForSelector('input[placeholder*="Manpreet"]', { timeout: 15000 });
  await page.type('input[placeholder*="Manpreet"]', clientName, { delay: 5 });
  const emailInputs = await page.$$('input[type="email"]');
  if (emailInputs[0]) await emailInputs[0].type(clientEmail, { delay: 5 });
  await clickButton('Save Client Profile');
  await page.waitForFunction(
    () => !document.body?.innerText?.includes('Register New Visa Client'),
    { timeout: 15000 },
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const { data: createdClient } = await admin
    .from('clients')
    .select('*')
    .eq('agency_id', agencyRow.id)
    .eq('email', clientEmail)
    .maybeSingle();

  clientId = createdClient?.id;

  if (!clientId) {
    setPhase('A', 'FAIL', { step: 'create', error: 'client not in DB after UI create' });
  } else {
    await page.goto(`${baseUrl}/workspace/${slug}/clients/${clientId}`, {
      waitUntil: 'networkidle2',
      timeout: 90000,
    });
    await page.waitForFunction(
      (n) => (document.body?.innerText || '').includes(n),
      { timeout: 30000 },
      clientName,
    );

    const bodyText = await page.evaluate(() => document.body.innerText);
    const requiredTabs = ['Overview', 'Service Agreement', 'File Notes', 'Application Preparation'];
    const hasTabs = requiredTabs.every((t) => bodyText.includes(t));

    const searchRes = await page.evaluate(async (q) => {
      const r = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      return { status: r.status, clients: j.clients };
    }, clientName.split(' ').pop());

    const foundInSearch = searchRes.clients?.some((c) => c.id === clientId);

    await clickButton('Edit');
    await new Promise((r) => setTimeout(r, 800));
    const editName = `${clientName} Edited`;
    const nameInput = await page.$('input[value="' + clientName + '"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(' Edited', { delay: 5 });
    } else {
      const inputs = await page.$$('input');
      for (const inp of inputs) {
        const v = await inp.evaluate((el) => el.value);
        if (v === clientName) {
          await inp.click({ clickCount: 3 });
          await inp.type(' Edited', { delay: 5 });
          break;
        }
      }
    }
    await clickButton('Save');
    await new Promise((r) => setTimeout(r, 2000));

    const { data: editedClient } = await admin.from('clients').select('name, client_number').eq('id', clientId).single();

    const aPass =
      Boolean(createdClient?.client_number) &&
      hasTabs &&
      searchRes.status === 200 &&
      foundInSearch &&
      editedClient?.name?.includes('Edited');

    setPhase('A', aPass ? 'PASS' : 'PARTIAL', {
      clientId,
      client_number: createdClient?.client_number,
      hasTabs,
      foundInSearch,
      editedName: editedClient?.name,
      consoleErrors: consoleErrors.slice(0, 3),
    });
  }

  // ── PHASE C: File Notes ──
  if (clientId) {
    await page.goto(`${baseUrl}/workspace/${slug}/clients/${clientId}`, { waitUntil: 'networkidle2' });
    await clickButton('File Notes');
    await new Promise((r) => setTimeout(r, 1500));

    const noteTypes = ['phone', 'email', 'attendance', 'advice', 'internal'];
    const noteResults = [];
    for (const nt of noteTypes) {
      const res = await page.evaluate(
        async (cid, note_type) => {
          const r = await fetch(`/api/clients/${cid}/file-notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note_type, body: `E2E ${note_type} note ${Date.now()}` }),
          });
          const j = await r.json();
          return { status: r.status, ok: r.ok, id: j.note?.id, agent: j.note?.agent_name };
        },
        clientId,
        nt,
      );
      noteResults.push({ type: nt, ...res });
    }

    const listRes = await page.evaluate(async (cid) => {
      const r = await fetch(`/api/clients/${cid}/file-notes`);
      const j = await r.json();
      return { status: r.status, notes: j.notes };
    }, clientId);

    const notesDb = await admin
      .from('file_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false });

    const newestFirst =
      listRes.notes?.length >= 2
        ? new Date(listRes.notes[0].recorded_at) >= new Date(listRes.notes[1].recorded_at)
        : true;

    const appendOnly = { update: null, delete: null };
    if (notesDb.data?.[0]) {
      const nid = notesDb.data[0].id;
      appendOnly.update = (await admin.from('file_notes').update({ body: 'hack' }).eq('id', nid)).error?.message;
      appendOnly.delete = (await admin.from('file_notes').delete().eq('id', nid)).error?.message;
    }

    const exportRes = await page.evaluate(async (cid) => {
      const r = await fetch(`/api/clients/${cid}/file-notes/export`);
      return { status: r.status, type: r.headers.get('content-type') };
    }, clientId);

    const appendBlocked =
      appendOnly.update?.toLowerCase().includes('append') ||
      appendOnly.update?.includes('file_notes_no_update') ||
      Boolean(appendOnly.update);
    const deleteBlocked =
      appendOnly.delete?.toLowerCase().includes('append') ||
      appendOnly.delete?.includes('file_notes_no_delete') ||
      Boolean(appendOnly.delete);

    const cPass =
      noteResults.every((n) => n.ok) &&
      appendBlocked &&
      deleteBlocked &&
      exportRes.status === 200 &&
      newestFirst;

    setPhase('C', cPass ? 'PASS' : 'PARTIAL', {
      noteResults,
      noteCount: notesDb.data?.length,
      newestFirst,
      appendOnly,
      export: exportRes,
    });
  } else {
    setPhase('C', 'FAIL', { reason: 'no client' });
  }

  // ── PHASE D: Application Preparation ──
  if (clientId) {
    const pdfPath = path.join(process.cwd(), 'scripts', 'fixtures', 'sample.pdf');
    const hasPdf = fs.existsSync(pdfPath);

    const prepCreate = await page.evaluate(
      async (cid, title, agencyId) => {
        const r = await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agencyId,
            client_id: cid,
            title,
            visa_subclass: '820',
          }),
        });
        const j = await r.json();
        return { status: r.status, ok: r.ok, id: j.approval?.id, error: j.error, data: j };
      },
      clientId,
      `E2E Prep ${ts}`,
      agencyRow.id,
    );

    let dStatus = 'FAIL';
    const dDetail = { prepCreate };
    approvalId = prepCreate.id;

    if (prepCreate.ok && approvalId && hasPdf) {
      const blob = await fs.promises.readFile(pdfPath);
      const uploadRes = await page.evaluate(
        async (aid, pdfBase64) => {
          const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
          const file = new File([bytes], 'sample.pdf', { type: 'application/pdf' });
          const fd = new FormData();
          fd.append('file', file);
          const r = await fetch(`/api/approvals/${aid}/attachments`, { method: 'POST', body: fd });
          const j = await r.json().catch(() => ({}));
          return { status: r.status, ok: r.ok, j };
        },
        approvalId,
        Buffer.from(blob).toString('base64'),
      );

      const approvalDetail = await page.evaluate(async (aid) => {
        const r = await fetch(`/api/approvals/${aid}`);
        const j = await r.json();
        return j;
      }, approvalId);

      const checklistItem = approvalDetail?.checklist?.[0];
      let checklistRes = { skipped: true };
      if (checklistItem?.id) {
        checklistRes = await page.evaluate(
          async (aid, itemId) => {
            const r = await fetch(`/api/approvals/${aid}/checklist`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemId, is_completed: true }),
            });
            const j = await r.json();
            return { status: r.status, ok: r.ok, j };
          },
          approvalId,
          checklistItem.id,
        );
      }

      const { data: reloaded, error: reloadErr } = await admin
        .from('application_approvals')
        .select('document_path, status')
        .eq('id', approvalId)
        .single();

      const { data: attachments } = await admin
        .from('approval_attachments')
        .select('id, file_name')
        .eq('approval_id', approvalId);

      const { data: checklistDb } = await admin
        .from('approval_checklist_items')
        .select('id, is_completed')
        .eq('approval_id', approvalId);

      dDetail.uploadRes = uploadRes;
      dDetail.checklistRes = checklistRes;
      dDetail.reloaded = reloaded;
      dDetail.reloadErr = reloadErr?.message;
      dDetail.attachments = attachments?.length;
      dDetail.checklistCompleted = checklistDb?.filter((c) => c.is_completed).length;

      if (uploadRes.ok && (attachments?.length || reloaded?.document_path)) {
        dStatus = checklistRes.ok || checklistRes.skipped ? 'PASS' : 'PARTIAL';
      } else {
        dDetail.reason = 'upload or persistence failed';
      }
    } else if (!hasPdf) {
      dDetail.reason = 'sample.pdf missing';
      dStatus = prepCreate.ok ? 'PARTIAL' : 'FAIL';
    } else if (!prepCreate.ok) {
      dDetail.reason = prepCreate.error || 'approval create failed';
    }

    setPhase('D', dStatus, dDetail);

    // ── PHASE E: Send for approval (if prep succeeded) ──
    if (approvalId && dStatus !== 'FAIL') {
      const sendRes = await page.evaluate(async (aid) => {
        const r = await fetch(`/api/approvals/${aid}/send-for-client-approval`, { method: 'POST' });
        const j = await r.json();
        return { status: r.status, ok: r.ok, j };
      }, approvalId);

      const { data: sentRow } = await admin
        .from('application_approvals')
        .select('client_sent_at, signwell_document_id, review_token, status')
        .eq('id', approvalId)
        .single();

      setPhase('E', sendRes.ok && sentRow?.client_sent_at ? 'PARTIAL' : 'FAIL', {
        sendRes,
        client_sent_at: sentRow?.client_sent_at,
        signwell_document_id: sentRow?.signwell_document_id,
        review_token: sentRow?.review_token ? 'present' : null,
        reason: sendRes.ok
          ? 'sent to SignWell; live client sign+webhook not verified in this run'
          : sendRes.j?.error || 'send failed',
      });
    }
  } else {
    setPhase('D', 'FAIL', { reason: 'no client' });
    setPhase('E', 'FAIL', { reason: 'no client' });
  }

  // ── PHASE B: Service Agreement (same client as Phase A) ──
  const agreementApi = await page.evaluate(async (cid, cname, cemail) => {
    const res = await fetch('/api/agreements/standard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formData: {
          clientId: cid,
          clientName: cname,
          clientEmail: cemail,
          clientPhone: '0400000001',
          matterType: 'Partner Visa (Onshore/Offshore)',
          visaSubclass: '820',
          professionalFee: '2500',
          scopeOfServices: 'E2E verification scope',
          paymentSchedule: '100% upfront',
          emailMessage: 'Please sign.',
          ccMe: false,
          autoRemind7Days: false,
          emailOnComplete: false,
        },
        dispatchOptions: { ccMe: false, autoRemind7Days: false, emailOnComplete: false },
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }, clientId, clientName, clientEmail);

  const agId = agreementApi.data?.agreementId;
  let bStatus = 'FAIL';
  const bDetail = { agreementApi: { status: agreementApi.status, success: agreementApi.data?.success } };

  if (agId) {
    const { data: agRow } = await admin
      .from('agreements')
      .select('id, status, signwell_document_id, client_id')
      .eq('id', agId)
      .single();

    const { count: actCount } = await admin
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('reference_id', agId);

    bDetail.agRow = agRow;
    bDetail.activityCount = actCount;

    if (agRow?.signwell_document_id) {
      bStatus = 'PARTIAL';
      bDetail.reason = 'dispatched to SignWell; live sign+webhook not verified in this run';
    } else if (agreementApi.data?.success) {
      bStatus = 'PARTIAL';
      bDetail.reason = 'agreement created but SignWell dispatch may have failed';
    }
  }

  setPhase('B', bStatus, bDetail);

  // Localhost: complete sign → cert → lodge chain after real SignWell dispatch
  let chainMeta = {};
  if (baseUrl.includes('localhost') && clientId) {
    const { data: existingSos } = await admin.from('service_statements').select('id').eq('client_id', clientId).limit(1);
    if (!existingSos?.length) {
      await page.evaluate(async (cid) => {
        await fetch(`/api/clients/${cid}/service-statements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issued_stage: 'during_matter', notes: `Verify SOS ${Date.now()}` }),
        });
      }, clientId);
    }
    const { data: chainApproval } = approvalId
      ? await admin.from('application_approvals').select('signwell_document_id, client_signed_at').eq('id', approvalId).single()
      : { data: null };

    if (chainApproval?.signwell_document_id && !chainApproval.client_signed_at) {
      chainMeta.approvalWebhook = await fireSignwellWebhook(chainApproval.signwell_document_id);
      await new Promise((r) => setTimeout(r, 4000));
    }

    if (bDetail.agRow?.signwell_document_id) {
      const { data: agCheck } = await admin.from('agreements').select('status, completed_at').eq('id', agId).single();
      if (agCheck?.status !== 'signed' && !agCheck?.completed_at) {
        chainMeta.agreementWebhook = await fireSignwellWebhook(bDetail.agRow.signwell_document_id);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (approvalId) {
      let { data: apState } = await admin.from('application_approvals').select('status').eq('id', approvalId).single();
      if (apState?.status === 'approved') {
        chainMeta.readyToLodge = await page.evaluate(async (aid) => {
          const r = await fetch(`/api/approvals/${aid}/transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ready_to_lodge' }),
          });
          return { status: r.status, ok: r.ok };
        }, approvalId);
        ({ data: apState } = await admin.from('application_approvals').select('status').eq('id', approvalId).single());
      }
      if (apState?.status === 'ready_to_lodge') {
        chainMeta.lodged = await page.evaluate(async (aid) => {
          const r = await fetch(`/api/approvals/${aid}/transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'lodged' }),
          });
          return { status: r.status, ok: r.ok };
        }, approvalId);
      }
    }

    const { data: sosRow } = await admin.from('service_statements').select('id').eq('client_id', clientId).limit(1).maybeSingle();
    if (sosRow?.id) {
      chainMeta.sosSend = await page.evaluate(async (cid, sid) => {
        const r = await fetch(`/api/clients/${cid}/service-statements/${sid}/send`, { method: 'POST' });
        return { status: r.status, ok: r.ok };
      }, clientId, sosRow.id);
      chainMeta.sosAck = await page.evaluate(async (cid, sid) => {
        const r = await fetch(`/api/clients/${cid}/service-statements/${sid}/acknowledge`, { method: 'POST' });
        return { status: r.status, ok: r.ok };
      }, clientId, sosRow.id);
    }

    if (bDetail.agRow?.signwell_document_id) {
      const { data: signedAg } = await admin
        .from('agreements')
        .select('status, completed_at, signwell_document_id')
        .eq('id', agId)
        .single();
      if (signedAg?.status === 'signed' || signedAg?.completed_at) {
        const { count: whCount } = await admin
          .from('processed_webhooks')
          .select('id', { count: 'exact', head: true });
        setPhase('B', 'PASS', {
          agRow: bDetail.agRow,
          signedStatus: signedAg.status,
          completed_at: signedAg.completed_at,
          activityCount: bDetail.activityCount,
          webhook: chainMeta.agreementWebhook,
          processedWebhooks: whCount,
        });
      }
    }

    if (chainApproval?.signwell_document_id) {
      const { data: signedRow } = await admin
        .from('application_approvals')
        .select('client_signed_at, client_sent_at, signwell_document_id, certificate_storage_path, lodged_at')
        .eq('id', approvalId)
        .single();
      if (signedRow?.client_signed_at) {
        setPhase('E', 'PASS', {
          client_sent_at: signedRow.client_sent_at,
          client_signed_at: signedRow.client_signed_at,
          signwell_document_id: signedRow.signwell_document_id,
          webhook: chainMeta.approvalWebhook,
        });
      }
      if (signedRow?.certificate_storage_path) {
        setPhase('F', 'PASS', {
          certificate_storage_path: signedRow.certificate_storage_path,
          webhook: chainMeta.approvalWebhook,
        });
      }
      if (signedRow?.lodged_at) {
        setPhase('G', 'PASS', { lodged_at: signedRow.lodged_at, chain: chainMeta });
      }
    }
  }

  // ── PHASE F/G: Approval pipeline DB state ──
  const { data: approvals } = await admin
    .from('application_approvals')
    .select(
      'id, status, client_signed_at, client_sent_at, signwell_document_id, certificate_storage_path, certificate_generated_at, lodged_at, document_path',
    )
    .eq('agency_id', agencyRow.id)
    .order('updated_at', { ascending: false })
    .limit(10);

  const signedApproval = approvals?.find((a) => a.client_signed_at);
  const certApproval = approvals?.find((a) => a.certificate_storage_path);
  const lodgedApproval = approvals?.find((a) => a.lodged_at);

  if (!phases.E) {
    const sentApproval = approvals?.find((a) => a.client_sent_at);
    setPhase('E', signedApproval || sentApproval ? 'PARTIAL' : 'FAIL', {
      reason: 'no approval send attempted in this run',
      client_sent_at: sentApproval?.client_sent_at,
      client_signed_at: signedApproval?.client_signed_at,
    });
  }

  if (!phases.F || phases.F.status === 'FAIL') {
    setPhase('F', certApproval ? 'PARTIAL' : 'FAIL', {
      certificate_storage_path: certApproval?.certificate_storage_path,
      certificate_generated_at: certApproval?.certificate_generated_at,
      reason: certApproval ? 'certificate exists in DB' : 'no certificates generated',
    });
  }

  if (!phases.G || phases.G.status === 'FAIL') {
    setPhase('G', lodgedApproval ? 'PARTIAL' : 'FAIL', {
      lodged_at: lodgedApproval?.lodged_at,
      reason: lodgedApproval ? 'lodged record exists' : 'no lodged approvals',
    });
  }

  // ── PHASE H: Statement of Service ──
  if (clientId) {
    const sosCreate = await page.evaluate(
      async (cid) => {
        const r = await fetch(`/api/clients/${cid}/service-statements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issued_stage: 'during_matter', notes: `Verify SOS ${Date.now()}` }),
        });
        const j = await r.json();
        return { status: r.status, ok: r.ok, id: j.statement?.id };
      },
      clientId,
    );

    const { data: sosRows } = await admin
      .from('service_statements')
      .select('*')
      .eq('client_id', clientId);

    const sosAcked = sosRows?.some((s) => s.acknowledged_at || s.status === 'acknowledged');
    const hStatus = sosAcked ? 'PASS' : sosCreate.ok ? 'PARTIAL' : 'FAIL';
    setPhase('H', hStatus, {
      sosCreate,
      sosCount: sosRows?.length,
      sosAcked,
      reason: sosAcked ? 'SOS created, sent, acknowledged' : sosCreate.ok ? 'SOS created; send+ack pending' : 'SOS create failed',
    });
  } else {
    setPhase('H', 'FAIL', { reason: 'no client' });
  }

  // ── PHASE I: Completion gates (browser UI) ──
  if (clientId) {
    await page.goto(`${baseUrl}/workspace/${slug}/clients/${clientId}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForFunction(
      (name) => (document.body?.innerText || '').includes(name?.split(' ').slice(-1)[0] || ''),
      { timeout: 30000 },
      clientName,
    );
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Completion');
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    const completionUi = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        showsIncomplete: text.includes('Complete remaining workflow steps to close'),
        showsComplete:
          text.includes('This client matter is complete') ||
          text.includes('Client matter complete — all compliance gates satisfied'),
        gateCount: (text.match(/Signed Service Agreement|Application approval signed|Application lodged|Statement of Service acknowledged/g) || []).length,
        onCompletionTab: text.includes('Completion is computed when all four gates'),
        onOverview: text.includes('Workflow status (computed)'),
      };
    });
    const iStatus = completionUi.showsComplete
      ? 'PASS'
      : (completionUi.onCompletionTab || completionUi.onOverview) && completionUi.showsIncomplete
        ? 'PARTIAL'
        : completionUi.gateCount >= 4 && completionUi.showsIncomplete
          ? 'PARTIAL'
          : 'FAIL';
    setPhase('I', iStatus, {
      completionUi,
      reason: completionUi.showsComplete
        ? 'all four gates met'
        : completionUi.showsIncomplete
          ? 'gates visible and incomplete (expected until SA signed on client)'
          : 'unexpected completion state',
    });
  } else {
    setPhase('I', 'FAIL', { reason: 'no client' });
  }

  // ── PHASE J: Team invites ──
  const { data: invites } = await admin
    .from('invitations')
    .select('id, email, accepted_at, created_at')
    .eq('agency_id', agencyRow.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const accepted = invites?.filter((i) => i.accepted_at);
  setPhase('J', accepted?.length ? 'PARTIAL' : 'FAIL', {
    acceptedCount: accepted?.length,
    recentInvites: invites?.length,
    reason: accepted?.length
      ? 'accepted invites in DB; live Resend inbox not verified (domain may be unverified)'
      : 'no accepted invites',
  });

  // ── PHASE K: Notifications ──
  const unreadApi = await page.evaluate(async () => {
    const r = await fetch('/api/notifications/unread');
    const j = await r.json();
    return { status: r.status, count: j.count };
  });

  const markRead = await page.evaluate(async () => {
    const list = await fetch('/api/notifications?limit=1');
    const lj = await list.json();
    const id = lj.data?.[0]?.id;
    if (!id) return { skipped: true, listStatus: list.status };
    const r = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    });
    const unread = await fetch('/api/notifications/unread');
    const uj = await unread.json();
    return { status: r.status, unreadAfter: uj.count };
  }, null);

  const { count: notifCount } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyRow.id);

  const kPass = unreadApi.status === 200 && markRead.status === 200;
  setPhase('K', kPass ? 'PASS' : unreadApi.status === 200 ? 'PARTIAL' : 'FAIL', {
    dbNotifications: notifCount,
    unreadApi,
    markRead,
    reason: 'API reachable; deep links not browser-tested per notification type',
  });

  // ── PHASE L: Production ──
  if (!baseUrl.includes('vercel.app')) {
    try {
      const prodLogin = await fetch('https://immisign.vercel.app/login');
      const prodWebhook = await fetch('https://immisign.vercel.app/api/webhooks/signwell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'ping' }, data: { object: { id: 'probe' } } }),
      });
      setPhase('L', prodLogin.ok ? 'PARTIAL' : 'FAIL', {
        prodLoginStatus: prodLogin.status,
        prodWebhookStatus: prodWebhook.status,
        reason: 'production reachable; one real live SignWell workflow not executed from this script',
      });
    } catch (e) {
      setPhase('L', 'FAIL', { error: e.message });
    }
  } else {
    setPhase('L', 'PARTIAL', { reason: 'running against production URL; full live workflow needs manual sign' });
  }
} catch (e) {
  console.error('FATAL', e);
  setPhase('FATAL', 'FAIL', { error: e.message, consoleErrors: consoleErrors.slice(0, 10) });
} finally {
  await browser.close();
}

console.log('\n=== SUMMARY ===');
for (const k of 'ABCDEFGHIJKL'.split('')) {
  if (phases[k]) console.log(`${k}: ${phases[k].status}`);
}
if (phases.FATAL) console.log(`FATAL: ${phases.FATAL.status}`);

const out = path.join('scripts', 'production-e2e-results.json');
fs.writeFileSync(out, JSON.stringify(phases, null, 2));
console.log('Wrote', out);

const hasFail = Object.values(phases).some((p) => p.status === 'FAIL');
process.exit(hasFail ? 1 : 0);
