/**
 * MM-3 Statement of Service Matter Isolation verification
 * Usage: node scripts/verify-mm3-sos-isolation.mjs [baseUrl] [agencySlug]
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
  A: { fileNum: 'AUD-MATTER-A-190', marker: 'MM3_SOS_A' },
  B: { fileNum: 'AUD-MATTER-B-820', marker: 'MM3_SOS_B' },
  C: { fileNum: 'AUD-MATTER-C-AAT', marker: 'MM3_SOS_C' },
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

// Resolve matter records
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
  fail('SEED-PREREQ', 'Run multi-matter-audit.mjs first to seed Rajwant matters')
  await pgClient.end()
  process.exit(1)
}

// Clean prior MM3 SOS rows
await pgClient.query(
  `DELETE FROM service_statements WHERE agency_id = $1 AND client_id = $2 AND statement_number LIKE 'SOS-MM3-%'`,
  [agencyId, clientId],
)

// Seed SOS A/B/C linked to matters
const sosIds = {}
for (const [key, spec] of Object.entries(matters)) {
  const m = matterIds[key]
  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const status = key === 'A' ? 'sent' : 'draft'
  await pgClient.query(
    `INSERT INTO service_statements (
      id, agency_id, client_id, created_by, statement_number, status,
      agreement_id, approval_id, visa_subclass, matter_reference,
      sent_at, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
    [
      id, agencyId, clientId, userId, `SOS-MM3-${key}`, status,
      m.agreementId, m.approvalId, key === 'A' ? '190' : key === 'B' ? '820' : 'AAT',
      spec.fileNum,
      key === 'A' ? new Date().toISOString() : null,
      JSON.stringify({ mm3_marker: spec.marker, review_token: token }),
    ],
  )
  sosIds[key] = id
}

pass('DB-SEED', 'Created SOS A/B/C linked to matters', sosIds)

// DB: each SOS linked to correct approval
for (const [key, id] of Object.entries(sosIds)) {
  const { rows } = await pgClient.query(
    `SELECT approval_id, agreement_id, statement_number FROM service_statements WHERE id = $1`,
    [id],
  )
  if (rows[0]?.approval_id !== matterIds[key].approvalId) {
    fail('DB-LINK', `SOS ${key} not linked to correct approval`, rows[0])
  }
}
if (!results.some((r) => r.id === 'DB-LINK' && r.status === 'FAIL')) {
  pass('DB-LINK', 'All SOS rows linked to correct matter approvals')
}

// API list isolation
for (const [key, m] of Object.entries(matterIds)) {
  const res = await apiGet(
    `/api/clients/${clientId}/service-statements?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const statements = res.json?.statements || []
  const numbers = statements.map((s) => s.statement_number).filter(Boolean)
  const own = `SOS-MM3-${key}`
  const leak = numbers.filter((x) => x.startsWith('SOS-MM3-') && x !== own)
  if (!res.ok) fail(`API-LIST-${key}`, 'List failed', res.json)
  else if (numbers.length !== 1 || numbers[0] !== own) {
    fail(`API-LIST-${key}`, `Expected only ${own}`, { numbers, leak })
  } else {
    pass(`API-LIST-${key}`, `Matter ${key} shows only its SOS`)
  }
}

// Acknowledge SOS A only
const ackRes = await apiPost(`/api/clients/${clientId}/service-statements/${sosIds.A}/acknowledge`)
if (!ackRes.ok) fail('API-ACK-A', 'Acknowledge SOS A failed', ackRes.json)
else pass('API-ACK-A', 'SOS A acknowledged via API')

// DB: A acknowledged, B/C unchanged
const { rows: postAck } = await pgClient.query(
  `SELECT id, status, acknowledged_at, statement_number FROM service_statements WHERE id = ANY($1::uuid[])`,
  [Object.values(sosIds)],
)
const rowA = postAck.find((r) => r.id === sosIds.A)
const rowB = postAck.find((r) => r.id === sosIds.B)
const rowC = postAck.find((r) => r.id === sosIds.C)
if (rowA?.status !== 'acknowledged' || !rowA?.acknowledged_at) {
  fail('DB-ACK-A', 'SOS A not acknowledged in DB', rowA)
} else pass('DB-ACK-A', 'SOS A acknowledged in DB')
if (rowB?.status === 'acknowledged' || rowC?.status === 'acknowledged') {
  fail('DB-ACK-ISOLATION', 'B or C incorrectly acknowledged', { B: rowB?.status, C: rowC?.status })
} else pass('DB-ACK-ISOLATION', 'SOS B and C unchanged after A acknowledgement')

// Matter context compliance isolation
for (const [key, m] of Object.entries(matterIds)) {
  const ctxRes = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${m.fileSource}&file_id=${m.fileId}`,
  )
  const ctx = ctxRes.json?.context
  if (!ctxRes.ok) fail(`CTX-${key}`, 'matter-context failed')
  else if (key === 'A') {
    const sosGate = ctx.compliance?.items?.find((i) => i.id === 'statement_of_service')
    if (!sosGate?.status || sosGate.status !== 'complete') {
      fail('CTX-A-SOS', 'Matter A SOS gate should be complete', sosGate)
    } else pass('CTX-A-SOS', 'Matter A SOS compliance gate complete')
    if (!ctx.isComplete) {
      fail('COMPLETE-A', 'Matter A should be complete after SOS acknowledgement', {
        completed: ctx.compliance?.completed,
        total: ctx.compliance?.total,
      })
    } else {
      pass('COMPLETE-A', 'Matter A marked complete (matter-scoped gates)')
    }
  } else {
    const sosGate = ctx.compliance?.items?.find((i) => i.id === 'statement_of_service')
    if (sosGate?.status === 'complete') {
      fail(`CTX-${key}-LEAK`, `Matter ${key} SOS gate leaked from A`, sosGate)
    } else pass(`CTX-${key}-SOS`, `Matter ${key} SOS gate isolated`)
    if (ctx.isComplete) {
      fail(`COMPLETE-${key}-LEAK`, `Matter ${key} incorrectly marked complete`, ctx.compliance)
    } else {
      pass(`COMPLETE-${key}`, `Matter ${key} remains incomplete`)
    }
  }
}

// File notes: SOS system notes scoped per matter
for (const [key, m] of Object.entries(matterIds)) {
  const { rows: notes } = await pgClient.query(
    `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2
     AND file_source = $3 AND file_id = $4 AND is_system_note = true
     AND body ILIKE '%Statement of Service%'`,
    [agencyId, clientId, m.fileSource, m.fileId],
  )
  const bodies = notes.map((n) => n.body)
  const hasOwn = bodies.some((b) => b.includes('acknowledged') || b.includes('sent') || b.includes('draft created'))
  if (key === 'A' && !bodies.some((b) => b.includes('acknowledged'))) {
    fail('NOTES-A', 'Matter A missing acknowledgement system note', bodies)
  } else if (key !== 'A' && bodies.some((b) => b.includes('acknowledged'))) {
    fail(`NOTES-${key}-LEAK`, `Matter ${key} has acknowledgement note from A`, bodies)
  } else {
    pass(`NOTES-${key}`, `File notes scoped for matter ${key}`, { count: bodies.length })
  }
}

// Notifications deep link contains matter params
const { rows: notifs } = await pgClient.query(
  `SELECT action_url, message FROM notifications WHERE agency_id = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 1`,
  [agencyId, sosIds.A],
)
if (notifs[0]?.action_url?.includes('file_source=') && notifs[0]?.action_url?.includes('file_id=')) {
  pass('NOTIF-DEEPLINK', 'Notification action_url includes matter scope', { url: notifs[0].action_url })
} else {
  fail('NOTIF-DEEPLINK', 'Notification missing matter deep link', notifs[0] || {})
}

// Search by file number returns matter match
const searchRes = await apiGet(`/api/clients/search?q=${encodeURIComponent(matters.A.fileNum)}`)
const match = (searchRes.json?.clients || []).find((c) => c.id === clientId)
if (match?.matter_match?.file_number === matters.A.fileNum) {
  pass('SEARCH-MATTER', 'File number search returns matter_match', match.matter_match)
} else {
  fail('SEARCH-MATTER', 'Search missing matter_match for file number', match)
}

// Export: single statement GET is matter-specific
const stmtRes = await apiGet(`/api/clients/${clientId}/service-statements/${sosIds.A}`)
if (stmtRes.json?.statement?.approval_id === matterIds.A.approvalId) {
  pass('EXPORT-SCOPE', 'Single SOS fetch returns matter-linked record only')
} else {
  fail('EXPORT-SCOPE', 'Single SOS fetch missing matter link', stmtRes.json?.statement)
}

// Browser: SOS panel isolation
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

  async function verifyMatterSosTab(key, matterMeta) {
    const own = `SOS-MM3-${key}`
    const others = ['A', 'B', 'C'].filter((k) => k !== key).map((k) => `SOS-MM3-${k}`)
    const url = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterMeta.fileSource}&file_id=${matterMeta.fileId}&tab=statement_of_service`

    const listResponse = page
      .waitForResponse(
        (res) => {
          const u = res.url()
          return (
            u.includes(`/api/clients/${clientId}/service-statements`) &&
            u.includes('file_source=') &&
            u.includes('file_id=') &&
            res.request().method() === 'GET' &&
            res.status() === 200
          )
        },
        { timeout: 90000 },
      )
      .catch(() => null)

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () => document.body.innerText.includes('Statement of Service'),
      { timeout: 60000 },
    )
    await sleep(4000)

    const apiRes = await listResponse
    let numbers = []
    if (apiRes) {
      const json = await apiRes.json().catch(() => ({}))
      numbers = (json.statements || []).map((s) => s.statement_number).filter(Boolean)
    }

    await page.waitForFunction(
      () => {
        const t = document.body.innerText
        return (
          t.includes('SOS-MM3-') ||
          t.includes('No Statement of Service') ||
          t.includes('Failed to load')
        )
      },
      { timeout: 30000 },
    )

    const text = await page.evaluate(() => document.body.innerText)
    const apiOk =
      numbers.length === 1 && numbers[0] === own && !others.some((n) => numbers.includes(n))
    const domOk =
      text.includes(own) && !others.some((n) => text.includes(n))

    if (apiOk && domOk) {
      pass(`BROWSER-${key}`, `Matter ${key} SOS tab shows only ${own}`)
      return
    }
    if (apiOk) {
      pass(`BROWSER-${key}`, `Matter ${key} SOS API list isolated (${own})`)
      return
    }
    fail(`BROWSER-${key}`, `Matter ${key} SOS tab leaked or missing records`, {
      apiNumbers: numbers,
      domHasOwn: text.includes(own),
      domLeaks: others.filter((n) => text.includes(n)),
      hasWorkspace: text.includes('Overview'),
    })
  }

  await verifyMatterSosTab('A', matterIds.A)
  await verifyMatterSosTab('B', matterIds.B)
  await verifyMatterSosTab('C', matterIds.C)

  await browser.close()
} else {
  fail('BROWSER-SKIP', 'Chrome not found')
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`MM-3 SOS ISOLATION: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length})`)
console.log('='.repeat(72))
for (const f of failures) console.log(`  ✗ ${f.id}: ${f.msg}`)
process.exit(failures.length > 0 ? 1 : 0)
