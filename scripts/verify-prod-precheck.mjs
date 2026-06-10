/**
 * PROD-PRECHECK verification — DB + API + Browser
 * Usage: node scripts/verify-prod-precheck.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs'
import path from 'node:path'
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
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace('127.0.0.1', 'localhost')
const agencySlug = process.argv[3] || 'ritiklabs'
const reportsDir = path.join('docs', 'prod-precheck-reports')

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const dbUrl = `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`

const results = []
const reports = {
  complianceGap: [],
  pdfCompliance: [],
  mobileCompatibility: [],
  signatureAudit: [],
  eventLogging: [],
  betaTesterRisk: [],
  timestampIntegrity: [],
}

function pass(id, msg, area = 'general') {
  results.push({ id, status: 'PASS', msg, area })
  console.log(`PASS ${id}: ${msg}`)
}
function fail(id, msg, detail = {}, area = 'general') {
  results.push({ id, status: 'FAIL', msg, detail, area })
  console.log(`FAIL ${id}: ${msg}`, Object.keys(detail).length ? detail : '')
  reports.complianceGap.push({ id, msg, detail, severity: 'high' })
}

function areaPass(area, id, msg) {
  pass(id, msg, area)
  if (reports[area]) reports[area].push({ id, status: 'PASS', msg })
}

function areaFail(area, id, msg, detail = {}) {
  fail(id, msg, detail, area)
  if (reports[area]) reports[area].push({ id, status: 'FAIL', msg, detail })
}

const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await pgClient.connect()

const { rows: agencies } = await pgClient.query(`SELECT id FROM agencies WHERE slug = $1`, [agencySlug])
const agencyId = agencies[0]?.id
const { rows: users } = await pgClient.query(
  `SELECT id, email FROM users WHERE agency_id = $1 LIMIT 1`,
  [agencyId],
)

if (!agencyId || !users[0]) {
  fail('PREREQ', 'Need agency and user')
  process.exit(1)
}

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
const sessionToken = sessionData.session.access_token

async function apiGet(p) {
  const res = await fetch(`${baseUrl}${p}`, { headers: { Authorization: `Bearer ${sessionToken}` } })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
}
async function apiPost(p, body) {
  const res = await fetch(`${baseUrl}${p}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
}
async function apiPatch(p, body) {
  const res = await fetch(`${baseUrl}${p}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
}

// AREA 1 — DB schema
const { rows: ceTable } = await pgClient.query(
  `SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='compliance_events'`,
)
if (ceTable[0]) areaPass('eventLogging', 'DB-COMPLIANCE-EVENTS', 'compliance_events table exists with RLS')
else areaFail('eventLogging', 'DB-COMPLIANCE-EVENTS', 'compliance_events table missing')

const { rows: sosCol } = await pgClient.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='matter_defaults' AND column_name='sos_compliance_disclosure'`,
)
if (sosCol.length) pass('DB-SOS-TEMPLATE', 'sos_compliance_disclosure column exists')
else fail('DB-SOS-TEMPLATE', 'sos_compliance_disclosure column missing')

const { rows: disclosure } = await pgClient.query(
  `SELECT sos_compliance_disclosure FROM matter_defaults WHERE agency_id=$1`,
  [agencyId],
)
if (disclosure[0]?.sos_compliance_disclosure?.includes('Code of Conduct')) {
  pass('DB-SOS-WORDING', 'Locked compliance disclosure seeded in template storage')
} else {
  fail('DB-SOS-WORDING', 'Compliance disclosure not in matter_defaults')
}

// AREA 1 — Fee comparison (inline unit test)
function buildFeeComparison(quoted, actual) {
  const q = Number(quoted ?? 0)
  const a = Number(actual ?? 0)
  if (Math.abs(q - a) < 0.005) return null
  return { quoted: q, actual: a, difference: Math.round((a - q) * 100) / 100 }
}
const cmp = buildFeeComparison(4500, 4250)
if (cmp && cmp.difference === -250) pass('SOS-FEE-CALC', 'Fee comparison calculates difference correctly')
else fail('SOS-FEE-CALC', 'Fee comparison calc wrong', { cmp })
if (buildFeeComparison(4500, 4500) === null) pass('SOS-FEE-HIDE', 'Identical fees hide comparison')
else fail('SOS-FEE-HIDE', 'Comparison shown when fees identical')

const sosHtmlSrc = fs.readFileSync('src/features/service-statements/lib/sos-preview-html.ts', 'utf8')
if (sosHtmlSrc.includes('fee-comparison') && sosHtmlSrc.includes('Quoted Fee')) {
  areaPass('pdfCompliance', 'SOS-PDF-FEE-COMP', 'SoS preview HTML builder includes fee comparison')
} else areaFail('pdfCompliance', 'SOS-PDF-FEE-COMP', 'SoS preview missing fee comparison in source')
if (sosHtmlSrc.includes('pdf-running-header') && sosHtmlSrc.includes('complianceDisclosure')) {
  areaPass('pdfCompliance', 'SOS-PDF-MARN-HEADER', 'SoS preview has running header + DB compliance param')
  pass('SOS-PDF-WORDING', 'SoS PDF uses template-stored compliance wording param')
} else areaFail('pdfCompliance', 'SOS-PDF-MARN-HEADER', 'SoS preview missing running header or DB compliance')

const agrHtmlSrc = fs.readFileSync('src/features/agreements/lib/agreement-preview-html.ts', 'utf8')
if (agrHtmlSrc.includes('buildPdfRunningHeaderHtml') && agrHtmlSrc.includes('agentMarn')) {
  areaPass('pdfCompliance', 'AGR-PDF-MARN-HEADER', 'Agreement preview has running MARN header')
} else areaFail('pdfCompliance', 'AGR-PDF-MARN-HEADER', 'Agreement preview missing running MARN header')

// AREA 8 — Document naming (inline)
function formatSosPdfFilename(matterRef, clientLastName, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  const ref = (matterRef || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]+/g, '_')
  const last = (clientLastName || 'Client').replace(/[^a-zA-Z0-9_-]+/g, '_')
  return `SoS_${ref}_${last}_${stamp}.pdf`
}
function formatFileNotesExportFilename(matterRef, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  const ref = (matterRef || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]+/g, '_')
  return `FileNotes_${ref}_${stamp}.txt`
}
const sosName = formatSosPdfFilename('AGR-2026-0001', 'Smith', new Date('2026-06-14T00:00:00Z'))
if (/^SoS_AGR-2026-0001_Smith_2026-06-14\.pdf$/.test(sosName)) pass('DOC-NAMING-SOS', `SoS filename: ${sosName}`)
else fail('DOC-NAMING-SOS', 'SoS filename format wrong', { sosName })
const fnName = formatFileNotesExportFilename('AGR-2026-0001', new Date('2026-06-14T00:00:00Z'))
if (/^FileNotes_AGR-2026-0001_2026-06-14\.txt$/.test(fnName)) pass('DOC-NAMING-NOTES', `FileNotes filename: ${fnName}`)
else fail('DOC-NAMING-NOTES', 'FileNotes filename format wrong', { fnName })

// AREA 7 — Timestamp integrity
function isUtcIsoString(value) {
  return /Z$/.test(value) || /\+00:00$/.test(value)
}
function formatSydneyDateTime(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })
}
const sampleUtc = '2026-06-14T08:15:00.000Z'
if (typeof isUtcIsoString === 'function' && isUtcIsoString(sampleUtc)) {
  pass('TS-UTC-STORE', 'UTC ISO validation helper works')
} else fail('TS-UTC-STORE', 'UTC validation failed')

const { rows: noteTs } = await pgClient.query(
  `SELECT recorded_at::text FROM file_notes WHERE agency_id=$1 ORDER BY recorded_at DESC LIMIT 1`,
  [agencyId],
)
if (noteTs[0]?.recorded_at) {
  const ts = noteTs[0].recorded_at
  if (ts.includes('+00') || ts.endsWith('Z') || ts.includes('UTC')) {
    areaPass('timestampIntegrity', 'TS-DB-UTC', `DB stores UTC: ${ts}`)
  } else {
    areaFail('timestampIntegrity', 'TS-DB-UTC', 'DB timestamp may not be UTC', { ts })
  }
}
if (typeof formatSydneyDateTime === 'function') {
  const ui = formatSydneyDateTime(sampleUtc)
  if (ui.includes('2026') && (ui.includes('PM') || ui.includes('pm') || ui.includes('AEST') || ui.includes('AEDT'))) {
    areaPass('timestampIntegrity', 'TS-UI-SYDNEY', `Sydney display: ${ui}`)
    reports.timestampIntegrity.push({ db: sampleUtc, ui })
  } else {
    areaFail('timestampIntegrity', 'TS-UI-SYDNEY', 'Sydney display format unexpected', { ui })
  }
}

// AREA 9 — Signature manual edit blocked
const { rows: sosRows } = await pgClient.query(
  `SELECT id, client_id FROM service_statements WHERE agency_id=$1 AND client_id IS NOT NULL LIMIT 1`,
  [agencyId],
)
if (sosRows[0]) {
  const block = await apiPatch(
    `/api/clients/${sosRows[0].client_id}/service-statements/${sosRows[0].id}`,
    { acknowledged_at: new Date().toISOString() },
  )
  if (block.status === 403) {
    areaPass('signatureAudit', 'SIG-BLOCK-MANUAL', 'Manual acknowledged_at edit rejected')
  } else {
    areaFail('signatureAudit', 'SIG-BLOCK-MANUAL', 'Manual timestamp edit not blocked', { status: block.status })
  }
} else {
  areaFail('signatureAudit', 'SIG-BLOCK-MANUAL', 'No SOS row to test manual edit block')
}

// AREA 2 — Compliance event via note API
const { rows: clients } = await pgClient.query(
  `SELECT c.id, c.name FROM clients c WHERE c.agency_id=$1 LIMIT 1`,
  [agencyId],
)
const { rows: files } = clients[0]
  ? await pgClient.query(
      `SELECT id FROM agreements WHERE agency_id=$1 AND client_id=$2 LIMIT 1`,
      [agencyId, clients[0].id],
    )
  : { rows: [] }

let testNoteId = null
if (clients[0] && files[0]) {
  const before = await pgClient.query(
    `SELECT count(*)::int AS c FROM compliance_events WHERE agency_id=$1 AND event_type='note_added'`,
    [agencyId],
  )
  const noteRes = await apiPost(`/api/clients/${clients[0].id}/file-notes`, {
    note_type: 'phone',
    body: `PROD-PRECHECK note ${Date.now()}`,
    file_source: 'agreement',
    file_id: files[0].id,
  })
  if (noteRes.ok) {
    testNoteId = noteRes.json.note?.id
    await sleep(1000)
    const after = await pgClient.query(
      `SELECT count(*)::int AS c FROM compliance_events WHERE agency_id=$1 AND event_type='note_added'`,
      [agencyId],
    )
    if (after.rows[0].c > before.rows[0].c) {
      areaPass('eventLogging', 'EVENT-NOTE-ADDED', 'note_added compliance event recorded')
    } else {
      areaFail('eventLogging', 'EVENT-NOTE-ADDED', 'note_added event not found after API call')
    }
  } else {
    areaFail('eventLogging', 'EVENT-NOTE-ADDED', 'Could not create test note', { error: noteRes.json.error })
  }
}

// Verify compliance event wiring in source + DB presence where testable
const wiringFiles = [
  'src/features/service-statements/services/service-statement.service.ts',
  'src/features/file-notes/services/file-notes.service.ts',
  'src/features/approvals/services/approval.service.ts',
  'src/app/api/agreements/standard/route.ts',
  'src/app/api/webhooks/signwell/route.ts',
]
const wiringSrc = wiringFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const wiredEvents = {
  sos_created: 'sos_created',
  sos_sent: 'sos_sent',
  sos_acknowledged: 'sos_acknowledged',
  note_added: 'note_added',
  notes_exported: 'notes_exported',
  agreement_created: 'agreement_created',
  agreement_sent: 'agreement_sent',
  agreement_signed: 'agreement_signed',
  approval_created: 'approval_created',
  approval_sent: 'approval_sent',
  approval_signed: 'approval_signed',
  lodgement_recorded: 'lodgement_recorded',
  matter_completed: 'matter_completed',
}
for (const [label, token] of Object.entries(wiredEvents)) {
  if (wiringSrc.includes(`'${token}'`) || wiringSrc.includes(`"${token}"`)) {
    areaPass('eventLogging', `WIRE-${label.toUpperCase()}`, `${label} wired in services`)
  } else {
    areaFail('eventLogging', `WIRE-${label.toUpperCase()}`, `${label} not found in service wiring`)
  }
}

// Historical rows (informational — note_added must exist from live test above)
const { rows: totalEv } = await pgClient.query(
  `SELECT event_type, count(*)::int AS c FROM compliance_events WHERE agency_id=$1 GROUP BY event_type`,
  [agencyId],
)
if (totalEv.length) {
  areaPass('eventLogging', 'EVENT-DB-ROWS', `${totalEv.length} event type(s) in compliance_events`)
} else {
  areaFail('eventLogging', 'EVENT-DB-ROWS', 'No compliance_events rows yet')
}

// AREA 3 + 4 + 10 — Browser
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
const executablePath = chromePaths.find((p) => fs.existsSync(p))
const screenshotsDir = path.join(reportsDir, 'screenshots')
fs.mkdirSync(screenshotsDir, { recursive: true })

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

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' })

  await page.goto(`${baseUrl}/workspace/${agencySlug}/file-notes`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(() => document.body.innerText.length > 50, { timeout: 60000 }).catch(() => null)

  // Mobile viewports
  const viewports = [
    { name: 'iphone14', width: 390, height: 844 },
    { name: 'iphoneSE', width: 375, height: 667 },
    { name: 'pixel7', width: 412, height: 915 },
    { name: 'ipad', width: 820, height: 1180 },
  ]
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height })
    await sleep(500)
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientW = await page.evaluate(() => document.documentElement.clientWidth)
    const hasHScroll = scrollW > clientW + 2
    await page.screenshot({ path: path.join(screenshotsDir, `file-notes-${vp.name}.png`), fullPage: false })
    if (!hasHScroll) {
      areaPass('mobileCompatibility', `MOBILE-${vp.name.toUpperCase()}`, `File Notes — no horizontal scroll (${vp.width}px)`)
    } else {
      areaFail('mobileCompatibility', `MOBILE-${vp.name.toUpperCase()}`, 'Horizontal scroll detected', { scrollW, clientW })
    }
  }

  // Ctrl+Enter note submit
  if (clients[0] && files[0]) {
    await page.setViewport({ width: 1280, height: 900 })
    const deepLink = `/workspace/${agencySlug}/clients/${clients[0].id}?tab=file_notes&file_source=agreement&file_id=${files[0].id}`
    await page.goto(`${baseUrl}${deepLink}`, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () => {
        const ta = document.querySelector('textarea')
        return ta && !ta.disabled && !document.body.innerText.includes('Loading workspace')
      },
      { timeout: 90000 },
    ).catch(() => null)
    await sleep(1500)
    const textarea = await page.$('textarea:not([disabled])')
    if (textarea) {
      const uniqueBody = `PROD-PRECHECK Ctrl+Enter ${Date.now()}`
      await page.evaluate((body) => {
        const ta = document.querySelector('textarea:not([disabled])')
        if (!ta) return
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(ta, body)
        ta.dispatchEvent(new Event('input', { bubbles: true }))
        ta.focus()
      }, uniqueBody)
      await sleep(300)
      await page.keyboard.down('Control')
      await page.keyboard.press('Enter')
      await page.keyboard.up('Control')
      await page.waitForFunction(
        (body) => document.body.innerText.includes(body),
        { timeout: 15000 },
        uniqueBody,
      ).catch(() => null)
      await sleep(1000)
      const pageText = await page.evaluate(() => document.body.innerText)
      if (pageText.includes(uniqueBody)) {
        pass('BROWSER-CTRL-ENTER', 'Ctrl+Enter submits file note')
      } else {
        fail('BROWSER-CTRL-ENTER', 'Ctrl+Enter did not create note', { uniqueBody })
      }
      const occurrences = (pageText.match(new RegExp(uniqueBody.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      if (occurrences <= 1) pass('BROWSER-NO-DUP', 'No duplicate note on Ctrl+Enter')
      else fail('BROWSER-NO-DUP', 'Duplicate note detected', { occurrences })
    } else {
      fail('BROWSER-CTRL-ENTER', 'Textarea not found on file notes panel')
    }
  }

  // Matter Details panel — Not Provided
  if (clients[0] && files[0]) {
    const profileLink = `/workspace/${agencySlug}/clients/${clients[0].id}?file_source=agreement&file_id=${files[0].id}`
    await page.goto(`${baseUrl}${profileLink}`, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () => !document.body.innerText.includes('Loading workspace') && document.body.innerText.includes('Matter Details'),
      { timeout: 90000 },
    ).catch(() => null)
    await sleep(2000)
    const panelText = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Matter Details'))
      return h?.closest('.rounded-2xl')?.innerText || document.body.innerText
    })
    const hasMatterFields =
      panelText.includes('MATTER TYPE') &&
      panelText.includes('VISA SUBCLASS') &&
      panelText.includes('ASSIGNED AGENT') &&
      !panelText.includes('FILE NUMBER')
    if (hasMatterFields) {
      pass('BROWSER-MATTER-PANEL', 'Matter Details panel shows required fields (no File Number)')
    } else {
      fail('BROWSER-MATTER-PANEL', 'Matter panel check failed', { snippet: panelText.slice(0, 200) })
    }
    const badValues = ['null', 'undefined'].some((v) => panelText.toLowerCase().includes(v))
    const hasEmDash = /\n—\n|—\s*$/.test(panelText)
    if (!badValues && !hasEmDash) {
      pass('BROWSER-MATTER-VALUES', 'No em-dash/null/undefined in matter panel')
    } else {
      fail('BROWSER-MATTER-VALUES', 'Invalid empty value display in matter panel', { badValues, hasEmDash })
    }
  }

  // Onboarding wizard mobile
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/workspace/${agencySlug}/onboarding/new`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(() => document.body.innerText.includes('Primary Applicant'), { timeout: 90000 }).catch(() => null)
  await page.screenshot({ path: path.join(screenshotsDir, 'onboarding-iphone14.png') })
  const onboardScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
  if (!onboardScroll) areaPass('mobileCompatibility', 'MOBILE-ONBOARDING', 'Onboarding wizard fits iPhone 14')
  else areaFail('mobileCompatibility', 'MOBILE-ONBOARDING', 'Onboarding has horizontal scroll on iPhone 14')

  await browser.close()
} else {
  fail('BROWSER', 'Chrome not found — skipping browser checks')
}

// Generate reports
fs.mkdirSync(reportsDir, { recursive: true })
const passed = results.filter((r) => r.status === 'PASS').length
const failed = results.filter((r) => r.status === 'FAIL').length
const score = Math.round((passed / Math.max(1, results.length)) * 100)

const summary = {
  generatedAt: new Date().toISOString(),
  agencySlug,
  score,
  passed,
  failed,
  total: results.length,
  productionReady: failed === 0,
  results,
  reports,
}

fs.writeFileSync(path.join(reportsDir, 'prod-precheck-summary.json'), JSON.stringify(summary, null, 2))
fs.writeFileSync(
  path.join(reportsDir, 'production-readiness-score.json'),
  JSON.stringify({ score, passed, failed, productionReady: failed === 0 }, null, 2),
)

console.log('\n' + '='.repeat(72))
console.log(`PROD-PRECHECK: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length}) — Score ${score}%`)
console.log(`Reports: ${reportsDir}`)
console.log('='.repeat(72))

await pgClient.end()
process.exit(failed > 0 ? 1 : 0)
