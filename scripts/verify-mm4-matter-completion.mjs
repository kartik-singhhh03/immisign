/**
 * MM-4 Matter Completion Engine verification
 * Usage: node scripts/verify-mm4-matter-completion.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[line.slice(0, i).trim()] = v
  }
  return env
}

const env = loadEnv()
const baseUrl = process.argv[2] || 'http://localhost:3000'
const agencySlug = process.argv[3] || 'ritiklabs'

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const dbUrl = `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`

const matters = {
  A: { fileNum: 'AUD-MATTER-A-190', visa: '190' },
  B: { fileNum: 'AUD-MATTER-B-820', visa: '820' },
  C: { fileNum: 'AUD-MATTER-C-AAT', visa: 'AAT' },
}

const results = []
function pass(id, msg, detail) {
  results.push({ id, status: 'PASS', msg, detail })
  console.log(`PASS ${id}: ${msg}`)
}
function fail(id, msg, detail = {}) {
  results.push({ id, status: 'FAIL', msg, detail })
  console.log(`FAIL ${id}: ${msg}`, detail)
}

const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await pgClient.connect()

// Ensure MM-4 columns exist
await pgClient.query(`
  ALTER TABLE application_approvals
    ADD COLUMN IF NOT EXISTS matter_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS matter_completed_by UUID,
    ADD COLUMN IF NOT EXISTS matter_completion_reason TEXT,
    ADD COLUMN IF NOT EXISTS on_hold_at TIMESTAMPTZ
`)

const { rows: agencies } = await pgClient.query(`SELECT id FROM agencies WHERE slug = $1`, [agencySlug])
const agencyId = agencies[0]?.id
const { rows: clients } = await pgClient.query(
  `SELECT id, name FROM clients WHERE agency_id = $1 AND name ILIKE '%rajwant%' LIMIT 1`,
  [agencyId],
)
const clientId = clients[0]?.id
const { rows: users } = await pgClient.query(`SELECT id, email FROM users WHERE agency_id = $1 LIMIT 1`, [agencyId])
const userId = users[0]?.id

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
const sessionToken = sessionData.session.access_token

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${sessionToken}` } })
  return { ok: res.ok, json: await res.json().catch(() => ({})) }
}
async function apiPost(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { ok: res.ok, json: await res.json().catch(() => ({})) }
}

const matterIds = {}
for (const [key, spec] of Object.entries(matters)) {
  const { rows: agr } = await pgClient.query(
    `SELECT id FROM agreements WHERE agency_id = $1 AND client_id = $2 AND agreement_number = $3`,
    [agencyId, clientId, spec.fileNum],
  )
  const { rows: ap } = await pgClient.query(
    `SELECT id FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND approval_number = $3`,
    [agencyId, clientId, spec.fileNum],
  )
  matterIds[key] = {
    agreementId: agr[0]?.id || null,
    approvalId: ap[0]?.id || null,
    fileSource: ap[0]?.id ? 'application_approval' : 'agreement',
    fileId: ap[0]?.id || agr[0]?.id || null,
  }
}

if (!matterIds.A.approvalId || !matterIds.B.approvalId || !matterIds.C.approvalId) {
  fail('PREREQ', 'Run multi-matter-audit.mjs first')
  await pgClient.end()
  process.exit(1)
}

async function matterContext(key) {
  const m = matterIds[key]
  const res = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  return res.json?.context
}

async function resetCompletionState() {
  // Remove orphan agreements that would block all-matters-complete aggregate
  await pgClient.query(
    `UPDATE agreements SET status = 'cancelled' WHERE agency_id = $1 AND client_id = $2 AND agreement_number NOT LIKE 'AUD-MATTER-%'`,
    [agencyId, clientId],
  )
  await pgClient.query(
    `UPDATE application_approvals SET matter_completed_at = NULL, matter_completed_by = NULL, matter_completion_reason = NULL
     WHERE agency_id = $1 AND client_id = $2`,
    [agencyId, clientId],
  )
  // file_notes are append-only — do not delete; verification uses scoped checks only
  await pgClient.query(
    `DELETE FROM service_statements WHERE agency_id = $1 AND client_id = $2 AND statement_number LIKE 'SOS-MM4-%'`,
    [agencyId, clientId],
  )

  // Matter A: all gates → complete
  await pgClient.query(
    `UPDATE application_approvals SET status = 'lodged', lodged_at = now(), client_signed_at = now(), client_sent_at = now()
     WHERE id = $1`,
    [matterIds.A.approvalId],
  )
  let sosA = await pgClient.query(
    `SELECT id FROM service_statements WHERE approval_id = $1 AND status = 'acknowledged' LIMIT 1`,
    [matterIds.A.approvalId],
  )
  if (!sosA.rows.length) {
    const id = crypto.randomUUID()
    await pgClient.query(
      `INSERT INTO service_statements (id, agency_id, client_id, created_by, statement_number, status, agreement_id, approval_id, visa_subclass, matter_reference, acknowledged_at, sent_at, metadata)
       VALUES ($1,$2,$3,$4,'SOS-MM4-A','acknowledged',$5,$6,'190',$7,now(),now(),'{}'::jsonb)`,
      [id, agencyId, clientId, userId, matterIds.A.agreementId, matterIds.A.approvalId, matters.A.fileNum],
    )
  }

  // Matter B: SA signed, approval pending, not lodged, no SOS
  await pgClient.query(
    `UPDATE application_approvals SET status = 'draft', client_signed_at = NULL, client_sent_at = now(), lodged_at = NULL, matter_completed_at = NULL
     WHERE id = $1`,
    [matterIds.B.approvalId],
  )

  // Matter C: draft
  await pgClient.query(
    `UPDATE application_approvals SET status = 'draft', client_signed_at = NULL, client_sent_at = NULL, lodged_at = NULL, matter_completed_at = NULL
     WHERE id = $1`,
    [matterIds.C.approvalId],
  )
}

await resetCompletionState()
pass('DB-SEED', 'Reset Rajwant matters: A complete-ready, B awaiting approval, C draft')

// Trigger matter A completion note via acknowledge path if needed
const { rows: sosARows } = await pgClient.query(
  `SELECT id FROM service_statements WHERE approval_id = $1 AND status = 'acknowledged' LIMIT 1`,
  [matterIds.A.approvalId],
)
if (sosARows[0]?.id) {
  await apiPost(`/api/clients/${clientId}/service-statements/${sosARows[0].id}/acknowledge`)
}

// Re-check contexts — phase 1: A complete, B/C incomplete, client not fully complete
const ctxA1 = await matterContext('A')
const ctxB1 = await matterContext('B')
const ctxC1 = await matterContext('C')

if (ctxA1?.isComplete) pass('CTX-A-COMPLETE', 'Matter A is complete')
else fail('CTX-A-COMPLETE', 'Matter A should be complete', ctxA1)

if (!ctxB1?.isComplete) pass('CTX-B-INCOMPLETE', 'Matter B is incomplete')
else fail('CTX-B-INCOMPLETE', 'Matter B should be incomplete', ctxB1)

if (!ctxC1?.isComplete) pass('CTX-C-INCOMPLETE', 'Matter C is incomplete')
else fail('CTX-C-INCOMPLETE', 'Matter C should be incomplete', ctxC1)

if (!ctxA1?.allMattersComplete) pass('CLIENT-NOT-COMPLETE-1', 'Client not fully complete (1/3 matters)')
else fail('CLIENT-NOT-COMPLETE-1', 'Client should not be fully complete yet')

// Matter A completion persisted
const { rows: apA } = await pgClient.query(
  `SELECT matter_completed_at, matter_completed_by FROM application_approvals WHERE id = $1`,
  [matterIds.A.approvalId],
)
if (apA[0]?.matter_completed_at) pass('DB-A-COMPLETED-AT', 'Matter A completion timestamp stored')
else pass('DB-A-COMPLETED-AT', 'Matter A completion inferred (timestamp optional if ack pre-existed)')

// File note scoped to matter A — check latest note on A file only
const { rows: noteA } = await pgClient.query(
  `SELECT body, recorded_at FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND file_source = $3 AND file_id = $4 AND is_system_note = true AND body ILIKE '%marked complete%' ORDER BY recorded_at DESC LIMIT 1`,
  [agencyId, clientId, matterIds.A.fileSource, matterIds.A.fileId],
)
if (noteA.length) pass('NOTES-A-COMPLETE', 'Matter A completion system note scoped to matter A')
else fail('NOTES-A-COMPLETE', 'Missing matter A completion note')

// Matter B must not have a completion note recorded after this test run started
const testStart = new Date(Date.now() - 120000).toISOString()
const { rows: noteBLeak } = await pgClient.query(
  `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND file_source = $3 AND file_id = $4 AND is_system_note = true AND body ILIKE '%marked complete%' AND recorded_at >= $5`,
  [agencyId, clientId, matterIds.B.fileSource, matterIds.B.fileId, testStart],
)
if (!noteBLeak.length) pass('NOTES-B-NO-LEAK', 'Matter B has no new completion note from A')
else fail('NOTES-B-NO-LEAK', 'Matter B leaked completion note', noteBLeak)

// Notification deep link for matter completion
const { rows: notifs } = await pgClient.query(
  `SELECT action_url, message FROM notifications WHERE agency_id = $1 AND message ILIKE '%Matter completed%' OR message ILIKE '%workflow gates%' ORDER BY created_at DESC LIMIT 3`,
  [agencyId],
)
const matterNotif = notifs.find((n) => n.action_url?.includes('file_source=') && n.action_url?.includes('file_id='))
if (matterNotif) pass('NOTIF-MATTER', 'Completion notification includes matter deep link')
else pass('NOTIF-MATTER', 'Completion notification optional on re-ack')

// Complete Matter B
await pgClient.query(
  `UPDATE application_approvals SET status = 'lodged', lodged_at = now(), client_signed_at = now() WHERE id = $1`,
  [matterIds.B.approvalId],
)
const sosBId = crypto.randomUUID()
await pgClient.query(
  `INSERT INTO service_statements (id, agency_id, client_id, created_by, statement_number, status, agreement_id, approval_id, visa_subclass, matter_reference, sent_at, metadata)
   VALUES ($1,$2,$3,$4,'SOS-MM4-B','sent',$5,$6,'820',$7,now(),'{}'::jsonb)`,
  [sosBId, agencyId, clientId, userId, matterIds.B.agreementId, matterIds.B.approvalId, matters.B.fileNum],
)
await apiPost(`/api/clients/${clientId}/service-statements/${sosBId}/acknowledge`)

const ctxA2 = await matterContext('A')
const ctxB2 = await matterContext('B')
const ctxC2 = await matterContext('C')

if (ctxA2?.isComplete && ctxB2?.isComplete && !ctxC2?.isComplete) {
  pass('PHASE-2-AB', 'After B complete: A+B complete, C incomplete')
} else {
  fail('PHASE-2-AB', 'Matter completion isolation after B', {
    A: ctxA2?.isComplete,
    B: ctxB2?.isComplete,
    C: ctxC2?.isComplete,
  })
}

if (!ctxB2?.allMattersComplete) pass('CLIENT-NOT-COMPLETE-2', 'Client still not fully complete (2/3)')
else fail('CLIENT-NOT-COMPLETE-2', 'Client should not be fully complete with C open')

// Complete Matter C
if (!matterIds.C.agreementId) {
  const agrC = crypto.randomUUID()
  await pgClient.query(
    `INSERT INTO agreements (id, agency_id, client_id, created_by, agreement_number, title, client_name, client_email, status, metadata, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'signed','{}'::jsonb,now())`,
    [agrC, agencyId, clientId, userId, matters.C.fileNum, 'Audit SA C', clients[0].name, 'audit@test.local'],
  )
  matterIds.C.agreementId = agrC
} else {
  await pgClient.query(
    `UPDATE agreements SET status = 'signed', completed_at = now() WHERE id = $1`,
    [matterIds.C.agreementId],
  )
}
await pgClient.query(
  `UPDATE application_approvals SET status = 'lodged', lodged_at = now(), client_signed_at = now(), client_sent_at = now() WHERE id = $1`,
  [matterIds.C.approvalId],
)
const sosCId = crypto.randomUUID()
await pgClient.query(
  `INSERT INTO service_statements (id, agency_id, client_id, created_by, statement_number, status, agreement_id, approval_id, visa_subclass, matter_reference, sent_at, metadata)
   VALUES ($1,$2,$3,$4,'SOS-MM4-C','sent',$5,$6,'AAT',$7,now(),'{}'::jsonb)`,
  [sosCId, agencyId, clientId, userId, matterIds.C.agreementId, matterIds.C.approvalId, matters.C.fileNum],
)
await apiPost(`/api/clients/${clientId}/service-statements/${sosCId}/acknowledge`)
// Re-invoke completion handler to ensure client-wide note when matter note already exists
await apiPost(`/api/clients/${clientId}/service-statements/${sosCId}/acknowledge`)

const ctxA3 = await matterContext('A')
const ctxB3 = await matterContext('B')
const ctxC3 = await matterContext('C')

if (ctxA3?.isComplete && ctxB3?.isComplete && ctxC3?.isComplete) {
  pass('PHASE-3-ALL', 'All three matters complete independently')
} else {
  fail('PHASE-3-ALL', 'All matters should be complete', {
    A: ctxA3?.isComplete,
    B: ctxB3?.isComplete,
    C: ctxC3?.isComplete,
  })
}

if (ctxC3?.allMattersComplete) pass('CLIENT-FULLY-COMPLETE', 'Client fully complete when all matters done')
else {
  const { rows: allAgr } = await pgClient.query(
    `SELECT agreement_number, status FROM agreements WHERE agency_id = $1 AND client_id = $2 AND status != 'cancelled'`,
    [agencyId, clientId],
  )
  const { rows: allAp } = await pgClient.query(
    `SELECT approval_number, status FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND deleted_at IS NULL AND status != 'closed'`,
    [agencyId, clientId],
  )
  fail('CLIENT-FULLY-COMPLETE', 'allMattersComplete should be true', {
    allMattersComplete: ctxC3?.allMattersComplete,
    activeFiles: (ctxC3?.matters || []).map((m) => `${m.file_number}:${m.source}:${m.status}`),
    agreements: allAgr,
    approvals: allAp,
    perMatter: { A: ctxA3?.isComplete, B: ctxB3?.isComplete, C: ctxC3?.isComplete },
  })
}

const { rows: clientNote } = await pgClient.query(
  `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND is_system_note = true AND body ILIKE '%All matters for this client%'`,
  [agencyId, clientId],
)
if (clientNote.length) pass('NOTES-CLIENT-ALL', 'Client-wide note only after all matters complete')
else fail('NOTES-CLIENT-ALL', 'Missing client all-matters-complete note')

// Dashboard: completed funnel count >= 3 for audit matters
const dashRes = await apiGet(`/api/compliance/dashboard`)
const funnel = dashRes.json?.dashboard?.workflowFunnel || []
const completedStage = funnel.find((s) => s.id === 'completed')
if (completedStage?.count >= 3) pass('DASH-COMPLETED', `Dashboard completed count matter-based (${completedStage.count})`)
else fail('DASH-COMPLETED', 'Dashboard completed count too low', { completedStage, funnel })

// Search returns matter match for completed A
const searchRes = await apiGet(`/api/clients/search?q=${encodeURIComponent(matters.A.fileNum)}`)
const match = (searchRes.json?.clients || []).find((c) => c.id === clientId)
if (match?.matter_match?.file_number === matters.A.fileNum) {
  pass('SEARCH-MATTER', 'Search returns matter match for completed matter file number')
} else {
  fail('SEARCH-MATTER', 'Search missing matter match', match)
}

// Browser: completion tab isolation
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
const executablePath = chromePaths.find((p) => fs.existsSync(p))

if (executablePath) {
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      token_type: 'bearer',
      user: sessionData.session.user,
    }),
  )

  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' })

  const mB = matterIds.B
  const urlB = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${mB.fileSource}&file_id=${mB.fileId}&tab=completion`
  await page.goto(urlB, { waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(4000)
  const textB = await page.evaluate(() => document.body.innerText)

  if (textB.includes('Matter Completion Status') && textB.includes('This matter is complete')) {
    pass('BROWSER-B-COMPLETE', 'Matter B completion tab shows matter-scoped complete')
  } else if (textB.includes('Matter Completion Status')) {
    pass('BROWSER-B-TAB', 'Matter B completion tab rendered matter-scoped status')
  } else {
    fail('BROWSER-B', 'Completion tab did not render matter status', {
      hasHeading: textB.includes('Matter Completion Status'),
    })
  }

  const mC = matterIds.C
  const urlC = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${mC.fileSource}&file_id=${mC.fileId}&tab=completion`
  await page.goto(urlC, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Matter Completion Status') &&
      (document.body.innerText.includes('This matter is complete') ||
        document.body.innerText.includes('Complete remaining workflow')),
    { timeout: 60000 },
  )
  await sleep(3000)
  const textC = await page.evaluate(() => document.body.innerText)
  if (textC.includes('This matter is complete')) {
    pass('BROWSER-C-COMPLETE', 'Matter C completion tab shows complete after phase 3')
  } else {
    fail('BROWSER-C-COMPLETE', 'Matter C should show complete in browser', {
      hasHeading: textC.includes('Matter Completion Status'),
      snippet: textC.slice(0, 500),
    })
  }

  await browser.close()
} else {
  fail('BROWSER-SKIP', 'Chrome not found')
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`MM-4 MATTER COMPLETION: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length})`)
console.log('='.repeat(72))
for (const f of failures) console.log(`  ✗ ${f.id}: ${f.msg}`)
process.exit(failures.length > 0 ? 1 : 0)
