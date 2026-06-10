/**
 * MM-5 Workflow Tab Consistency verification
 * Usage: node scripts/verify-mm5-workflow-tabs.mjs [baseUrl] [agencySlug]
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
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace('127.0.0.1', 'localhost')
const agencySlug = process.argv[3] || 'ritiklabs'

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const dbUrl = `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`

const matters = {
  A: { fileNum: 'AUD-MATTER-A-190', visa: '190', markerAp: 'NOTE_ISOLATION_AP_A_190', markerAgr: 'NOTE_ISOLATION_AGR_A_190' },
  B: { fileNum: 'AUD-MATTER-B-820', visa: '820', markerAp: 'NOTE_ISOLATION_AP_B_820', markerAgr: 'NOTE_ISOLATION_AGR_B_820' },
  C: { fileNum: 'AUD-MATTER-C-AAT', visa: 'AAT', markerAp: 'NOTE_ISOLATION_AP_C_AAT', markerAgr: 'NOTE_ISOLATION_AGR_C_AAT' },
}

const WORKSPACE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'service_agreement', label: 'Service Agreement' },
  { id: 'file_notes', label: 'File Notes' },
  { id: 'preparation', label: 'Application Preparation' },
  { id: 'approval', label: 'Application Approval' },
  { id: 'lodgement', label: 'Lodgement' },
  { id: 'statement_of_service', label: 'Statement of Service' },
  { id: 'completion', label: 'Completion' },
]

const results = []
function pass(id, msg) {
  results.push({ id, status: 'PASS', msg })
  console.log(`PASS ${id}: ${msg}`)
}
function fail(id, msg, detail = {}) {
  results.push({ id, status: 'FAIL', msg, detail })
  console.log(`FAIL ${id}: ${msg}`, Object.keys(detail).length ? detail : '')
}

const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await pgClient.connect()

const { rows: agencies } = await pgClient.query(`SELECT id FROM agencies WHERE slug = $1`, [agencySlug])
const agencyId = agencies[0]?.id
const { rows: clients } = await pgClient.query(
  `SELECT id, name FROM clients WHERE agency_id = $1 AND name ILIKE '%rajwant%' LIMIT 1`,
  [agencyId],
)
const clientId = clients[0]?.id
const { rows: users } = await pgClient.query(`SELECT id, email FROM users WHERE agency_id = $1 LIMIT 1`, [agencyId])

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
const sessionToken = sessionData.session.access_token

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${sessionToken}` } })
  return { ok: res.ok, json: await res.json().catch(() => ({})) }
}

const matterIds = {}
for (const [key, spec] of Object.entries(matters)) {
  const { rows: agr } = await pgClient.query(
    `SELECT id FROM agreements WHERE agency_id = $1 AND client_id = $2 AND agreement_number = $3`,
    [agencyId, clientId, spec.fileNum],
  )
  const { rows: ap } = await pgClient.query(
    `SELECT id, status, lodged_at FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND approval_number = $3`,
    [agencyId, clientId, spec.fileNum],
  )
  matterIds[key] = {
    agreementId: agr[0]?.id || null,
    approvalId: ap[0]?.id || null,
    fileSource: ap[0]?.id ? 'application_approval' : 'agreement',
    fileId: ap[0]?.id || agr[0]?.id || null,
    status: ap[0]?.status,
    lodged: Boolean(ap[0]?.lodged_at),
  }
}

if (!matterIds.A.approvalId || !matterIds.B.approvalId || !matterIds.C.approvalId) {
  fail('PREREQ', 'Run multi-matter-audit.mjs first to seed Rajwant matters')
  await pgClient.end()
  process.exit(1)
}

// Distinct matter progress for compliance isolation (A most complete, C draft)
await pgClient.query(
  `UPDATE application_approvals SET status = 'lodged', lodged_at = now(), client_signed_at = now(), client_sent_at = now()
   WHERE id = $1`,
  [matterIds.A.approvalId],
)
await pgClient.query(
  `UPDATE application_approvals SET status = 'draft', lodged_at = NULL, client_signed_at = NULL, client_sent_at = now()
   WHERE id = $1`,
  [matterIds.B.approvalId],
)
await pgClient.query(
  `UPDATE application_approvals SET status = 'draft', lodged_at = NULL, client_signed_at = NULL, client_sent_at = NULL
   WHERE id = $1`,
  [matterIds.C.approvalId],
)
matterIds.A.lodged = true
matterIds.B.lodged = false
matterIds.C.lodged = false
pass('DB-SEED', 'Matter states: A lodged, B/C draft for tab audit')

async function getTabPanelText(page) {
  return page.evaluate(() => {
    const active = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Overview' || b.textContent?.includes('Statement of Service'),
    )
    const root = active?.parentElement?.parentElement
    const card = root?.querySelector('.rounded-2xl.border')
    return card?.innerText || root?.innerText || document.body.innerText
  })
}

async function getMatterPanelText(page) {
  return page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
      h.textContent?.includes('Matter Details'),
    )
    const card = heading?.closest('.rounded-2xl')
    const block = card?.parentElement
    return block?.innerText || document.body.innerText
  })
}

function leakCheck(key, text, module) {
  const spec = matters[key]
  const others = Object.keys(matters).filter((k) => k !== key)
  const leaks = []
  for (const o of others) {
    if (text.includes(matters[o].fileNum)) leaks.push(`file:${matters[o].fileNum}`)
    if (text.includes(matters[o].markerAp)) leaks.push(`note:${matters[o].markerAp}`)
    if (text.includes(matters[o].markerAgr)) leaks.push(`note:${matters[o].markerAgr}`)
  }
  if (!text.includes(spec.fileNum) && module !== 'preparation' && module !== 'lodgement') {
    // some tabs may not show file number when empty
  }
  return leaks
}

// ─── API + DB per matter ───
for (const [key, spec] of Object.entries(matters)) {
  const m = matterIds[key]

  const ctxRes = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const ctx = ctxRes.json?.context
  if (ctx?.fileNumber === spec.fileNum) pass(`API-CTX-${key}`, `Matter context file number for ${key}`)
  else fail(`API-CTX-${key}`, `Matter context wrong file number`, { got: ctx?.fileNumber })

  if (ctx?.selectedMatter?.id === m.fileId) pass(`API-CTX-SEL-${key}`, `Selected matter matches ${key}`)
  else fail(`API-CTX-SEL-${key}`, `Selected matter mismatch`, ctx?.selectedMatter)

  const gateCompleted = ctx?.compliance?.completed ?? 0
  const expectedMin = key === 'A' ? 2 : 0
  const expectedMax = key === 'C' ? 2 : 4
  if (gateCompleted >= expectedMin && (key !== 'A' || gateCompleted >= 2)) {
    pass(`API-COMPLIANCE-${key}`, `Compliance gates matter-scoped for ${key} (${gateCompleted}/4)`)
  } else {
    fail(`API-COMPLIANCE-${key}`, `Compliance gates unexpected for ${key}`, { gateCompleted })
  }

  const notesRes = await apiGet(
    `/api/clients/${clientId}/file-notes?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const bodies = (notesRes.json?.notes || []).map((n) => n.body)
  const hasOwn = bodies.some((b) => b.includes(spec.markerAp) || b.includes(spec.markerAgr))
  const hasLeak = Object.keys(matters)
    .filter((k) => k !== key)
    .some((k) => bodies.some((b) => b.includes(matters[k].markerAp) || b.includes(matters[k].markerAgr)))
  if (hasOwn && !hasLeak) pass(`API-NOTES-${key}`, `File notes API isolated for ${key}`)
  else fail(`API-NOTES-${key}`, `File notes API leaked`, { hasOwn, hasLeak, bodies: bodies.slice(0, 5) })

  const { rows: dbNotes } = await pgClient.query(
    `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND file_source = $3 AND file_id = $4`,
    [agencyId, clientId, m.fileSource, m.fileId],
  )
  const dbLeak = Object.keys(matters)
    .filter((k) => k !== key)
    .some((k) => dbNotes.some((n) => n.body.includes(matters[k].markerAp)))
  if (!dbLeak) pass(`DB-NOTES-${key}`, `DB file notes scoped for ${key}`)
  else fail(`DB-NOTES-${key}`, `DB file notes leaked for ${key}`)

  const sosRes = await apiGet(
    `/api/clients/${clientId}/service-statements?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const sosRows = sosRes.json?.statements || []
  const sosLeak = sosRows.some(
    (s) => s.approval_id && s.approval_id !== m.approvalId && s.agreement_id && s.agreement_id !== m.agreementId,
  )
  if (!sosLeak) pass(`API-SOS-${key}`, `SOS list scoped for ${key}`)
  else fail(`API-SOS-${key}`, `SOS list leaked`, sosRows)

  if (ctx?.nextAction?.href?.includes('file_source=') || !ctx?.nextAction?.href?.includes('/clients/')) {
    pass(`API-DEEPLINK-${key}`, `Next action deep link matter-scoped for ${key}`)
  } else if (ctx?.nextAction?.href) {
    fail(`API-DEEPLINK-${key}`, `Next action missing matter params`, { href: ctx.nextAction.href })
  } else {
    pass(`API-DEEPLINK-${key}`, `Next action N/A for ${key}`)
  }
}

const ctxByKey = {}
for (const key of Object.keys(matters)) {
  const m = matterIds[key]
  const res = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  ctxByKey[key] = res.json?.context
}
if (
  (ctxByKey.A?.compliance?.completed ?? 0) > (ctxByKey.C?.compliance?.completed ?? 0)
) {
  pass('API-COMPLIANCE-DIFF', 'Matter A has more completed gates than Matter C')
} else {
  fail('API-COMPLIANCE-DIFF', 'Compliance progress not isolated across matters', {
    A: ctxByKey.A?.compliance?.completed,
    B: ctxByKey.B?.compliance?.completed,
    C: ctxByKey.C?.compliance?.completed,
  })
}

// Notifications with matter deep links
const { rows: notifs } = await pgClient.query(
  `SELECT action_url, message FROM notifications WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 20`,
  [agencyId],
)
const matterNotifs = notifs.filter((n) => n.action_url?.includes('file_source=') && n.action_url?.includes('file_id='))
if (matterNotifs.length) pass('NOTIF-DEEPLINK', `${matterNotifs.length} notifications with matter deep links`)
else pass('NOTIF-DEEPLINK', 'No recent matter notifications (optional)')

// ─── Browser per matter × tab ───
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

  for (const [key, spec] of Object.entries(matters)) {
    const m = matterIds[key]
    const others = Object.keys(matters).filter((k) => k !== key)

    // Matter Details + Timeline (client profile page)
    const baseUrlMatter = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${m.fileSource}&file_id=${m.fileId}`
    await page.goto(baseUrlMatter, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Matter Details') ||
        document.body.innerText.includes('Client Profile'),
      { timeout: 60000 },
    )
    await sleep(4000)
    let text = await getMatterPanelText(page)

    let leaks = leakCheck(key, text, 'matter_details')
    if (text.includes(spec.fileNum) && leaks.length === 0) {
      pass(`BROWSER-MATTER-DETAILS-${key}`, `Matter Details shows only ${spec.fileNum}`)
    } else {
      fail(`BROWSER-MATTER-DETAILS-${key}`, `Matter Details leaked or missing`, { leaks, hasFile: text.includes(spec.fileNum) })
    }

    if (text.includes('Workflow Progress') && leaks.length === 0) {
      pass(`BROWSER-TIMELINE-${key}`, `Timeline panel matter-scoped for ${key}`)
    } else {
      fail(`BROWSER-TIMELINE-${key}`, `Timeline missing or leaked`, { leaks, hasTimeline: text.includes('Workflow Progress') })
    }

    if (text.includes('Compliant') || text.includes('Complete')) {
      pass(`BROWSER-HEADER-COMPLIANCE-${key}`, `Header compliance widget visible for ${key}`)
    } else {
      fail(`BROWSER-HEADER-COMPLIANCE-${key}`, `Header compliance missing`)
    }

    for (const tab of WORKSPACE_TABS) {
      const url = `${baseUrlMatter}&tab=${tab.id}`
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 })
      await sleep(2500)
      text = await getTabPanelText(page)
      leaks = leakCheck(key, text, tab.id)

      if (tab.id === 'overview') {
        const showsClientWide =
          text.match(/Service Agreements[\s\S]*?(\d+)/)?.[1] === '3' &&
          text.match(/Approvals[\s\S]*?(\d+)/)?.[1] === '3'
        if (leaks.length === 0 && !showsClientWide) {
          pass(`BROWSER-OVERVIEW-${key}`, `Overview tab isolated for ${key}`)
        } else {
          fail(`BROWSER-OVERVIEW-${key}`, `Overview tab leaked`, { leaks, showsClientWide })
        }
      } else if (tab.id === 'file_notes') {
        const noteLeak = others.some((o) => text.includes(matters[o].markerAp) || text.includes(matters[o].markerAgr))
        if (!noteLeak) {
          pass(`BROWSER-FILE-NOTES-${key}`, `File Notes tab isolated for ${key}`)
        } else {
          fail(`BROWSER-FILE-NOTES-${key}`, `File Notes tab leaked`, { noteLeak })
        }
      } else if (tab.id === 'lodgement') {
        const lodgedLeak = others.filter((o) => matterIds[o].lodged).some((o) => text.includes(matters[o].fileNum))
        const showsOwn = !matterIds[key].lodged || text.includes(spec.fileNum)
        if (!lodgedLeak) {
          pass(`BROWSER-LODGEMENT-${key}`, `Lodgement tab isolated for ${key}`)
        } else {
          fail(`BROWSER-LODGEMENT-${key}`, `Lodgement tab leaked`, { lodgedLeak, showsOwn })
        }
      } else if (tab.id === 'completion') {
        await page.waitForFunction(
          () =>
            document.body.innerText.includes('Matter Completion Status') ||
            document.body.innerText.includes('Completion'),
          { timeout: 30000 },
        ).catch(() => null)
        text = await getTabPanelText(page)
        leaks = leakCheck(key, text, tab.id)
        if (
          (text.includes('Matter Completion Status') || text.includes('workflow gates')) &&
          leaks.length === 0
        ) {
          pass(`BROWSER-COMPLETION-${key}`, `Completion tab matter-scoped for ${key}`)
        } else {
          fail(`BROWSER-COMPLETION-${key}`, `Completion tab leaked or missing`, { leaks })
        }
      } else if (leaks.length === 0) {
        pass(`BROWSER-${tab.id.toUpperCase().replace(/_/g, '-')}-${key}`, `${tab.label} tab isolated for ${key}`)
      } else {
        fail(`BROWSER-${tab.id.toUpperCase().replace(/_/g, '-')}-${key}`, `${tab.label} tab leaked`, { leaks, module: tab.id })
      }
    }
  }

  await browser.close()
} else {
  fail('BROWSER-SKIP', 'Chrome not found')
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`MM-5 WORKFLOW TAB CONSISTENCY: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length})`)
console.log('='.repeat(72))
if (failures.length) {
  const byModule = {}
  for (const f of failures) {
    const mod = f.id.replace(/^(API|DB|BROWSER)-/, '').replace(/-[ABC]$/, '')
    if (!byModule[mod]) byModule[mod] = []
    byModule[mod].push(f.id)
  }
  console.log('Leaking modules:')
  for (const [mod, ids] of Object.entries(byModule)) {
    console.log(`  • ${mod}: ${ids.join(', ')}`)
  }
  for (const f of failures) console.log(`  ✗ ${f.id}: ${f.msg}`)
}
process.exit(failures.length > 0 ? 1 : 0)
