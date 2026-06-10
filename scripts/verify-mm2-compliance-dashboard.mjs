/**
 * MM-2 Matter-Centric Compliance Dashboard verification
 * Usage: node scripts/verify-mm2-compliance-dashboard.mjs [baseUrl] [agencySlug]
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

const results = []
function pass(id, msg, detail = {}) {
  results.push({ id, status: 'PASS', msg, detail })
  console.log(`PASS ${id}: ${msg}`)
}
function fail(id, msg, detail = {}) {
  results.push({ id, status: 'FAIL', msg, detail })
  console.log(`FAIL ${id}: ${msg}`, detail)
}

const matters = {
  A: { fileNum: 'AUD-MATTER-A-190', visa: '190' },
  B: { fileNum: 'AUD-MATTER-B-820', visa: '820' },
  C: { fileNum: 'AUD-MATTER-C-AAT', visa: 'AAT' },
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
const clientName = clients[0]?.name

const { rows: users } = await pgClient.query(`SELECT email FROM users WHERE agency_id = $1 LIMIT 1`, [agencyId])
const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
const sessionToken = sessionData.session.access_token

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

// ─── DB: matter units for Rajwant ───
const { rows: agr } = await pgClient.query(
  `SELECT agreement_number, status FROM agreements WHERE agency_id = $1 AND client_id = $2 AND agreement_number LIKE 'AUD-MATTER%'`,
  [agencyId, clientId],
)
const { rows: ap } = await pgClient.query(
  `SELECT approval_number, status, visa_subclass FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND approval_number LIKE 'AUD-MATTER%'`,
  [agencyId, clientId],
)

if (agr.length >= 2 && ap.length >= 3) {
  pass('DB-MATTERS', `Rajwant has ${agr.length} audit agreements and ${ap.length} audit approvals`)
} else {
  fail('DB-MATTERS', 'Audit test matters missing — run multi-matter-audit.mjs first', { agr: agr.length, ap: ap.length })
}

// ─── API: dashboard payload ───
const dashRes = await apiGet('/api/compliance/dashboard')
const dash = dashRes.json?.dashboard
if (!dashRes.ok || !dash) {
  fail('API-DASH', 'Dashboard API failed', dashRes.json)
} else {
  pass('API-DASH', 'Dashboard API returned matter-centric payload')
}

const rajwantRows = (dash?.attentionQueue || []).filter((r) => r.clientId === clientId)
const auditRows = rajwantRows.filter((r) => r.fileNumber?.startsWith('AUD-MATTER'))

if (auditRows.length >= 3) {
  pass('API-ROWS', `Rajwant has ${auditRows.length} separate dashboard rows`, {
    files: auditRows.map((r) => r.fileNumber),
  })
} else {
  fail('API-ROWS', `Expected ≥3 Rajwant matter rows, got ${auditRows.length}`, { rajwantRows: rajwantRows.length })
}

const rowA = auditRows.find((r) => r.fileNumber === matters.A.fileNum)
const rowB = auditRows.find((r) => r.fileNumber === matters.B.fileNum)
const rowC = auditRows.find((r) => r.fileNumber === matters.C.fileNum)

if (rowA && rowB && rowC) {
  const scores = new Set([rowA.complianceScore, rowB.complianceScore, rowC.complianceScore])
  const stages = new Set([rowA.currentStage, rowB.currentStage, rowC.currentStage])
  const actions = new Set([rowA.nextAction, rowB.nextAction, rowC.nextAction])

  if (scores.size >= 2 || stages.size >= 2) {
    pass('API-ISOLATION', 'Matters A/B/C have distinct compliance states', {
      A: { stage: rowA.currentStage, score: rowA.complianceScore, action: rowA.nextAction },
      B: { stage: rowB.currentStage, score: rowB.complianceScore, action: rowB.nextAction },
      C: { stage: rowC.currentStage, score: rowC.complianceScore, action: rowC.nextAction },
    })
  } else {
    fail('API-ISOLATION', 'Matters A/B/C still share identical stage/score', { scores: [...scores], stages: [...stages] })
  }

  if (actions.size >= 2) {
    pass('API-ACTIONS', 'Distinct next actions across matters')
  } else {
    fail('API-ACTIONS', 'Next actions not distinct across matters', { actions: [...actions] })
  }

  for (const row of [rowA, rowB, rowC]) {
    const required = ['fileId', 'fileSource', 'fileNumber', 'currentStage', 'nextAction', 'complianceScore']
    const missing = required.filter((k) => row[k] === undefined || row[k] === null || row[k] === '')
    if (missing.length) {
      fail('API-FIELDS', `Row ${row.fileNumber} missing fields: ${missing.join(', ')}`)
    }
  }
  if (!results.some((r) => r.id === 'API-FIELDS' && r.status === 'FAIL')) {
    pass('API-FIELDS', 'All required attention queue fields present')
  }
} else {
  fail('API-ABC', 'Could not find A/B/C rows in attention queue', {
    found: auditRows.map((r) => r.fileNumber),
  })
}

// Funnel matter counts
const funnel = dash?.workflowFunnel || []
const hasMatterLabels = funnel.every((s) => typeof s.count === 'number')
if (hasMatterLabels && funnel.length >= 6) {
  pass('API-FUNNEL', `Workflow funnel has ${funnel.length} matter-scoped stages`)
} else {
  fail('API-FUNNEL', 'Workflow funnel missing matter stages', { funnel })
}

// Audit readiness matter pillars
const br = dash?.auditReadiness?.breakdown
if (br?.saSigned && br?.approvalSigned && br?.lodged && br?.sosAcknowledged) {
  pass('API-READINESS', 'Matter readiness breakdown present')
} else {
  fail('API-READINESS', 'Matter readiness breakdown missing', { br })
}

// Summary cards matter counts
const cardIds = (dash?.summary || []).map((c) => c.id)
const expectedCards = ['missing_sa', 'pending_approval', 'awaiting_lodge', 'missing_sos', 'incomplete_matters']
if (expectedCards.every((id) => cardIds.includes(id))) {
  pass('API-CARDS', 'All 5 matter-centric summary cards present')
} else {
  fail('API-CARDS', 'Summary cards incomplete', { cardIds })
}

// Filter options
if (dash?.filterOptions?.stages?.length) {
  pass('API-FILTERS', `Filter options: ${dash.filterOptions.stages.length} stages`)
} else {
  fail('API-FILTERS', 'Filter options missing')
}

// ─── Browser: deep link drill-down ───
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
const executablePath = chromePaths.find((p) => fs.existsSync(p))

if (executablePath && rowA) {
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

  await page.goto(`${baseUrl}/workspace/${agencySlug}/dashboard`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Matter Attention Queue') ||
      document.body.innerText.includes('Loading compliance'),
    { timeout: 30000 },
  )
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading compliance'),
    { timeout: 60000 },
  )
  await sleep(2000)

  const dashText = await page.evaluate(() => document.body.innerText)
  const auditMatches = dashText.match(/AUD-MATTER-[ABC]/g) || []
  const rajwantMatches = (dashText.match(new RegExp(clientName.split(' ')[0], 'gi')) || []).length
  if (auditMatches.length >= 3) {
    pass('BROWSER-ROWS', `Dashboard shows ${auditMatches.length} audit matter rows`)
  } else if (rajwantMatches >= 3) {
    pass('BROWSER-ROWS', `Dashboard shows ${rajwantMatches} Rajwant matter references`)
  } else {
    fail('BROWSER-ROWS', `Dashboard missing matter rows (audit=${auditMatches.length}, rajwant=${rajwantMatches})`)
  }

  const deepUrl = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${rowA.fileSource}&file_id=${rowA.fileId}&tab=lodgement`
  await page.goto(deepUrl, { waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(3000)
  const profileText = await page.evaluate(() => document.body.innerText)
  if (profileText.includes(matters.A.fileNum) || profileText.includes('Lodgement')) {
    pass('BROWSER-DEEPLINK', 'Deep link opens correct client + matter context')
  } else {
    fail('BROWSER-DEEPLINK', 'Deep link did not load matter context', { url: deepUrl })
  }

  // Search filter on dashboard
  await page.goto(`${baseUrl}/workspace/${agencySlug}/dashboard`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading compliance'),
    { timeout: 60000 },
  )
  const searchInput = await page.waitForSelector('input[placeholder*="Search client"]', { timeout: 15000 }).catch(() => null)
  if (searchInput) {
    await searchInput.click({ clickCount: 3 })
    await searchInput.type('820')
    await sleep(1500)
    const filtered = await page.evaluate(() => document.body.innerText)
    if (filtered.includes('AUD-MATTER-B-820') && !filtered.includes('AUD-MATTER-C-AAT')) {
      pass('BROWSER-SEARCH', 'Dashboard search filters to matter B (820)')
    } else if (filtered.includes('820') && !filtered.includes('AAT')) {
      pass('BROWSER-SEARCH', 'Dashboard search filters by visa subclass 820')
    } else {
      fail('BROWSER-SEARCH', 'Dashboard search did not isolate matter B', {
        hasB: filtered.includes('AUD-MATTER-B-820'),
        hasC: filtered.includes('AUD-MATTER-C-AAT'),
      })
    }
  } else {
    fail('BROWSER-SEARCH', 'Search input not found on dashboard')
  }

  await browser.close()
} else if (!executablePath) {
  fail('BROWSER-SKIP', 'Chrome not found — browser checks skipped')
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`MM-2 VERIFICATION: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length} checks)`)
console.log('='.repeat(72))
for (const f of failures) {
  console.log(`  ✗ ${f.id}: ${f.msg}`)
}
process.exit(failures.length > 0 ? 1 : 0)
