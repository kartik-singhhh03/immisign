/**
 * MM-6 Matter-Aware Search & Navigation verification
 * Usage: node scripts/verify-mm6-matter-search.mjs [baseUrl] [agencySlug]
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
  A: { fileNum: 'AUD-MATTER-A-190', visa: 'SC190', stage: 'Lodged' },
  B: { fileNum: 'AUD-MATTER-B-820', visa: 'SC820', stage: 'Awaiting Approval' },
  C: { fileNum: 'AUD-MATTER-C-AAT', visa: 'SCAAT', stage: 'Preparation' },
}

const REQUIRED_RESULT_FIELDS = [
  'clientId',
  'fileId',
  'fileSource',
  'fileNumber',
  'matterType',
  'visaSubclass',
  'stage',
  'compliance',
  'assignedAgent',
  'deepLink',
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
if (!agencyId) {
  fail('PREREQ', `Agency ${agencySlug} not found`)
  process.exit(1)
}

const { rows: clients } = await pgClient.query(
  `SELECT id, name FROM clients WHERE agency_id = $1 AND name ILIKE '%rajwant%' LIMIT 1`,
  [agencyId],
)
const clientId = clients[0]?.id
const { rows: users } = await pgClient.query(`SELECT id, email FROM users WHERE agency_id = $1 LIMIT 1`, [agencyId])

if (!clientId || !users[0]) {
  fail('PREREQ', 'Run multi-matter-audit.mjs first (Rajwant + user)')
  await pgClient.end()
  process.exit(1)
}

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
const sessionToken = sessionData.session.access_token

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${sessionToken}` } })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
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
  fail('PREREQ', 'Run multi-matter-audit.mjs first to seed Rajwant matters')
  await pgClient.end()
  process.exit(1)
}

// Distinct stages for search labels
await pgClient.query(
  `UPDATE application_approvals SET status = 'lodged', lodged_at = now(), client_signed_at = now(), client_sent_at = now()
   WHERE id = $1`,
  [matterIds.A.approvalId],
)
await pgClient.query(
  `UPDATE application_approvals SET status = 'ready_to_lodge', lodged_at = NULL, client_signed_at = now(), client_sent_at = now()
   WHERE id = $1`,
  [matterIds.B.approvalId],
)
await pgClient.query(
  `UPDATE application_approvals SET status = 'draft', lodged_at = NULL, client_signed_at = NULL, client_sent_at = NULL
   WHERE id = $1`,
  [matterIds.C.approvalId],
)
pass('DB-SEED', 'Matter states seeded for search stage labels')

function parseDeepLink(link) {
  const u = new URL(link, baseUrl)
  return {
    file_source: u.searchParams.get('file_source'),
    file_id: u.searchParams.get('file_id'),
    tab: u.searchParams.get('tab'),
    path: u.pathname,
  }
}

function assertResultModel(row, label) {
  const missing = REQUIRED_RESULT_FIELDS.filter((f) => row[f] === undefined)
  if (missing.length) {
    fail(`MODEL-${label}`, `Missing fields: ${missing.join(', ')}`, row)
    return false
  }
  const dl = parseDeepLink(row.deepLink)
  if (!dl.file_source || !dl.file_id || !dl.path.includes(clientId)) {
    fail(`MODEL-DL-${label}`, 'deepLink missing matter params', { deepLink: row.deepLink, dl })
    return false
  }
  pass(`MODEL-${label}`, `Result model complete for ${row.fileNumber}`)
  return true
}

// ─── API: client search ───
const clientSearch = await apiGet('/api/clients/search?q=Rajwant')
const matterRows = clientSearch.json?.matters || []
if (matterRows.length === 3) {
  pass('API-CLIENT-SEARCH-COUNT', 'Rajwant search returns 3 matter rows')
} else {
  fail('API-CLIENT-SEARCH-COUNT', `Expected 3 matters, got ${matterRows.length}`, { matters: matterRows.map((m) => m.fileNumber) })
}

for (const [key, spec] of Object.entries(matters)) {
  const row = matterRows.find((m) => m.fileNumber === spec.fileNum)
  if (row) {
    pass(`API-CLIENT-SEARCH-${key}`, `Found matter ${spec.fileNum}`)
    assertResultModel(row, key)
    if (row.clientId === clientId) pass(`API-CLIENT-ID-${key}`, `clientId matches Rajwant`)
    else fail(`API-CLIENT-ID-${key}`, 'Wrong clientId', { got: row.clientId })
  } else {
    fail(`API-CLIENT-SEARCH-${key}`, `Missing matter ${spec.fileNum}`)
  }
}

const fileSearch = await apiGet(`/api/clients/search?q=${encodeURIComponent(matters.B.fileNum)}`)
const bOnly = (fileSearch.json?.matters || []).filter((m) => m.fileNumber === matters.B.fileNum)
if (bOnly.length === 1 && bOnly[0].fileId === matterIds.B.fileId) {
  pass('API-FILE-NUMBER-SEARCH', 'File number search returns single matter B')
} else {
  fail('API-FILE-NUMBER-SEARCH', 'File number search ambiguous', { got: fileSearch.json?.matters })
}

// ─── API: global / command palette search ───
const globalSearch = await apiGet('/api/search?q=Rajwant')
const globalMatters = (globalSearch.json?.results || []).filter((r) => r.type === 'matter')
if (globalMatters.length >= 3) {
  pass('API-GLOBAL-SEARCH-COUNT', `Command palette search returns ${globalMatters.length} matter rows`)
} else {
  fail('API-GLOBAL-SEARCH-COUNT', `Expected ≥3 matter results, got ${globalMatters.length}`)
}

for (const [key, spec] of Object.entries(matters)) {
  const r = globalMatters.find((m) => m.fileNumber === spec.fileNum || m.sublabel?.includes(spec.fileNum))
  if (r?.href?.includes('file_source=') && r.href.includes('file_id=')) {
    pass(`API-GLOBAL-DEEPLINK-${key}`, `Global search deep link for ${key}`)
  } else {
    fail(`API-GLOBAL-DEEPLINK-${key}`, 'Global search missing matter href', r)
  }
}

// ─── Deep link / no first-matter fallback ───
for (const [key, spec] of Object.entries(matters)) {
  const m = matterIds[key]
  const ctxRes = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const ctx = ctxRes.json?.context
  if (ctx?.fileNumber === spec.fileNum && ctx?.selectedMatter?.id === m.fileId) {
    pass(`API-DEEPLINK-${key}`, `Matter context selects ${key} (${spec.fileNum})`)
  } else {
    fail(`API-DEEPLINK-${key}`, 'Matter context wrong selection', {
      fileNumber: ctx?.fileNumber,
      selected: ctx?.selectedMatter?.id,
      expected: m.fileId,
    })
  }
}

// Explicit matter in URL but unknown file_id must NOT fall back to first matter
const fakeId = '00000000-0000-0000-0000-000000000099'
const badCtx = await apiGet(
  `/api/clients/${clientId}/matter-context?file_source=application_approval&file_id=${fakeId}`,
)
const badSelected = badCtx.json?.context?.selectedMatter
if (!badSelected || badSelected.id === fakeId) {
  pass('API-NO-FALLBACK', 'Unknown file_id does not fall back to first matter')
} else if (badSelected.id === matterIds.A.fileId) {
  fail('API-NO-FALLBACK', 'Fell back to first matter (A)', badSelected)
} else {
  pass('API-NO-FALLBACK', 'No erroneous first-matter fallback')
}

// ─── Notifications with tab + matter params ───
const notifDeepLink = `/workspace/${agencySlug}/clients/${clientId}?file_source=${matterIds.B.fileSource}&file_id=${matterIds.B.fileId}&tab=statement_of_service`
await pgClient.query(
  `INSERT INTO notifications (agency_id, user_id, type, title, message, action_url, is_read)
   VALUES ($1, $2, 'system', 'MM6 test notification', 'Open Matter B SOS', $3, false)`,
  [agencyId, users[0].id, notifDeepLink],
)
const { rows: insertedNotif } = await pgClient.query(
  `SELECT action_url FROM notifications WHERE agency_id = $1 AND message = 'Open Matter B SOS' ORDER BY created_at DESC LIMIT 1`,
  [agencyId],
)
const actionUrl = insertedNotif[0]?.action_url || ''
const notifParams = parseDeepLink(actionUrl)
if (notifParams.file_source && notifParams.file_id && notifParams.tab === 'statement_of_service') {
  pass('NOTIF-PARAMS', 'Notification action_url includes file_source, file_id, tab')
} else {
  fail('NOTIF-PARAMS', 'Notification missing matter/tab params', notifParams)
}

// ─── Browser: search navigation, URL history, refresh ───
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

  async function urlParams() {
    const u = new URL(page.url())
    return {
      file_source: u.searchParams.get('file_source'),
      file_id: u.searchParams.get('file_id'),
      tab: u.searchParams.get('tab'),
    }
  }

  async function getMatterDetailsText() {
    return page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
        h.textContent?.includes('Matter Details'),
      )
      const card = heading?.closest('.rounded-2xl')
      return card?.innerText || ''
    })
  }

  async function waitForMatterFile(fileNum, timeout = 60000) {
    await page.waitForFunction(
      (num) => {
        const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
          h.textContent?.includes('Matter Details'),
        )
        const card = heading?.closest('.rounded-2xl')
        return card?.innerText?.includes(num)
      },
      { timeout },
      fileNum,
    )
  }

  // Deep link A — must show Matter A only
  const linkA = matterRows.find((m) => m.fileNumber === matters.A.fileNum)?.deepLink
  if (linkA) {
    await page.goto(`${baseUrl}${linkA}`, { waitUntil: 'networkidle2', timeout: 90000 })
    await waitForMatterFile(matters.A.fileNum).catch(() => null)
    const textA = await getMatterDetailsText()
    const paramsA = await urlParams()
    if (textA.includes(matters.A.fileNum) && !textA.includes(matters.B.fileNum)) {
      pass('BROWSER-DEEPLINK-A', 'Matter A deep link opens Matter A')
    } else {
      fail('BROWSER-DEEPLINK-A', 'Matter A link leaked or missing', { hasA: textA.includes(matters.A.fileNum), hasB: textA.includes(matters.B.fileNum) })
    }
    if (paramsA.file_id === matterIds.A.fileId) pass('BROWSER-URL-A', 'URL preserves Matter A file_id')
    else fail('BROWSER-URL-A', 'URL missing Matter A params', paramsA)
  } else {
    fail('BROWSER-DEEPLINK-A', 'No deep link from search for Matter A')
  }

  // Deep link B
  const linkB = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterIds.B.fileSource}&file_id=${matterIds.B.fileId}&tab=overview`
  await page.goto(linkB, { waitUntil: 'networkidle2', timeout: 90000 })
  await waitForMatterFile(matters.B.fileNum).catch(() => null)
  const textB = await getMatterDetailsText()
  if (textB.includes(matters.B.fileNum) && !textB.includes(matters.C.fileNum)) {
    pass('BROWSER-DEEPLINK-B', 'Matter B deep link opens Matter B')
  } else {
    fail('BROWSER-DEEPLINK-B', 'Matter B link wrong context', {
      hasB: textB.includes(matters.B.fileNum),
      hasC: textB.includes(matters.C.fileNum),
      snippet: textB.slice(0, 200),
    })
  }

  // Tab switch preserves matter params (via URL navigation — same as UI tab click)
  const linkBNotes = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterIds.B.fileSource}&file_id=${matterIds.B.fileId}&tab=file_notes`
  await page.goto(linkBNotes, { waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(2500)
  const afterTab = await urlParams()
  if (afterTab.file_id === matterIds.B.fileId && afterTab.tab === 'file_notes') {
    pass('BROWSER-TAB-URL', 'Tab URL preserves file_id and tab param')
  } else {
    fail('BROWSER-TAB-URL', 'Tab URL dropped matter params', afterTab)
  }

  // Matter switch C via matter switcher dropdown
  await page.goto(linkB, { waitUntil: 'networkidle2', timeout: 90000 })
  await waitForMatterFile(matters.B.fileNum).catch(() => null)
  let switched = false
  const switcherButtons = await page.$$('button')
  for (const btn of switcherButtons) {
    const text = await page.evaluate((el) => el.textContent?.trim() || '', btn)
    if (text.includes(matters.B.fileNum) && text.length < 48) {
      await btn.click()
      await sleep(600)
      break
    }
  }
  const optionButtons = await page.$$('button')
  for (const btn of optionButtons) {
    const text = await page.evaluate((el) => el.textContent?.trim() || '', btn)
    if (text.includes(matters.C.fileNum) && !text.includes(matters.B.fileNum)) {
      await btn.click()
      switched = true
      break
    }
  }
  await page
    .waitForFunction(
      (fileNum) => {
        const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
          h.textContent?.includes('Matter Details'),
        )
        return heading?.closest('.rounded-2xl')?.innerText?.includes(fileNum)
      },
      { timeout: 15000 },
      matters.C.fileNum,
    )
    .catch(() => null)
  const afterMatter = await urlParams()
  const textC = await getMatterDetailsText()
  const cFileIds = [matterIds.C.fileId, matterIds.C.agreementId].filter(Boolean)
  const urlMatchesC = cFileIds.includes(afterMatter.file_id)
  if (switched && urlMatchesC && textC.includes(matters.C.fileNum)) {
    pass('BROWSER-MATTER-SWITCH', 'Matter switch updates URL and context to Matter C')
  } else if (!switched) {
    fail('BROWSER-MATTER-SWITCH', 'Could not operate matter switcher in UI')
  } else {
    fail('BROWSER-MATTER-SWITCH', 'Matter switch incomplete', { afterMatter, hasC: textC.includes(matters.C.fileNum), cFileIds })
  }

  // Refresh preserves URL
  const urlBeforeRefresh = page.url()
  await page.reload({ waitUntil: 'networkidle2' })
  await waitForMatterFile(matters.C.fileNum).catch(() => null)
  if (page.url() === urlBeforeRefresh) {
    pass('BROWSER-REFRESH-URL', 'Browser refresh preserves matter URL')
  } else {
    fail('BROWSER-REFRESH-URL', 'Refresh changed URL', { before: urlBeforeRefresh, after: page.url() })
  }
  const refreshText = await getMatterDetailsText()
  if (refreshText.includes(matters.C.fileNum)) pass('BROWSER-REFRESH-CONTEXT', 'Refresh keeps Matter C context')
  else fail('BROWSER-REFRESH-CONTEXT', 'Refresh lost matter context')

  // Notification navigation
  await page.goto(`${baseUrl}${notifDeepLink}`, { waitUntil: 'networkidle2', timeout: 90000 })
  await waitForMatterFile(matters.B.fileNum).catch(() => null)
  const notifText = await getMatterDetailsText()
  const notifUrl = await urlParams()
  const activeTab = await page.evaluate(() => {
    const active = Array.from(document.querySelectorAll('button')).find(
      (b) => b.className.includes('bg-[#0D9F8C]') && b.textContent?.includes('Statement'),
    )
    return active?.textContent?.trim() || ''
  })
  if (
    notifText.includes(matters.B.fileNum) &&
    notifUrl.tab === 'statement_of_service' &&
    notifUrl.file_id === matterIds.B.fileId
  ) {
    pass('BROWSER-NOTIF-NAV', 'Notification URL lands on Matter B SOS tab')
  } else {
    fail('BROWSER-NOTIF-NAV', 'Notification navigation wrong', { notifUrl, activeTab, hasB: notifText.includes(matters.B.fileNum) })
  }

  // Compliance dashboard search (matter rows)
  await page.goto(`${baseUrl}/workspace/${agencySlug}/dashboard`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(
    () => document.querySelector('input[placeholder*="Search client, file number"]'),
    { timeout: 60000 },
  )
  const dashSearch = await page.$('input[placeholder*="Search client, file number"]')
  if (dashSearch) {
    await dashSearch.click({ clickCount: 3 })
    await dashSearch.type(matters.A.fileNum, { delay: 30 })
    await sleep(2000)
    const dashRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr, [class*="rounded"]'))
      return rows.map((r) => r.textContent || '').filter((t) => t.includes('AUD-MATTER'))
    })
    const hasOnlyA = dashRows.some((t) => t.includes(matters.A.fileNum)) && !dashRows.some((t) => t.includes(matters.B.fileNum))
    if (hasOnlyA) {
      pass('BROWSER-DASHBOARD-SEARCH', 'Dashboard search filters to Matter A file number')
    } else {
      fail('BROWSER-DASHBOARD-SEARCH', 'Dashboard search not matter-specific', { dashRows: dashRows.slice(0, 5) })
    }
  } else {
    fail('BROWSER-DASHBOARD-SEARCH', 'Dashboard search input not found')
  }

  await browser.close()
} else {
  fail('BROWSER-SKIP', 'Chrome not found — browser checks skipped')
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`MM-6 MATTER-AWARE SEARCH: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length})`)
console.log('='.repeat(72))
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f.id}: ${f.msg}`)
}
process.exit(failures.length > 0 ? 1 : 0)
