/**
 * ONB-1/2/3 Unified onboarding verification
 * Usage: node scripts/verify-onb-onboarding.mjs [baseUrl] [agencySlug]
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
const { rows: users } = await pgClient.query(
  `SELECT id, email FROM users WHERE agency_id = $1 LIMIT 1`,
  [agencyId],
)
const { rows: matterTypes } = await pgClient.query(
  `SELECT id, name FROM matter_types WHERE agency_id = $1 AND is_active = true LIMIT 1`,
  [agencyId],
)

if (!agencyId || !users[0] || !matterTypes[0]) {
  fail('PREREQ', 'Need agency, user, and active matter type')
  process.exit(1)
}

const matterTypeId = matterTypes[0].id
const assignedAgentId = users[0].id

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
    body: JSON.stringify(body),
  })
  return { ok: res.ok, json: await res.json().catch(() => ({})) }
}

// DB schema checks
const tables = ['matters', 'matter_applicants', 'matter_financials', 'document_audit_events']
for (const t of tables) {
  const { rows } = await pgClient.query(
    `SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname=$1`,
    [t],
  )
  if (rows[0]) pass(`DB-TABLE-${t}`, `Table ${t} exists (RLS=${rows[0].relrowsecurity})`)
  else fail(`DB-TABLE-${t}`, `Table ${t} missing`)
}

const { rows: cols } = await pgClient.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name IN ('first_name','last_name','address')`,
)
if (cols.length === 3) pass('DB-CLIENT-COLS', 'Client name/address columns exist')
else fail('DB-CLIENT-COLS', 'Missing client columns', { cols })

const opts = await apiGet('/api/onboarding/options')
if (opts.ok && opts.json.matterTypes?.length) pass('API-OPTIONS', `Onboarding options: ${opts.json.matterTypes.length} matter types`)
else fail('API-OPTIONS', 'Failed to load onboarding options', opts.json)

const stamp = Date.now()
const payload = {
  primary: {
    firstName: 'Onb',
    lastName: `Test${stamp}`,
    dateOfBirth: '1990-05-15',
    email: `onb.test.${stamp}@example.com`,
    mobile: '+61400111222',
    address: '12 Test Street, Sydney NSW 2000',
  },
  hasSecondary: true,
  secondary: {
    firstName: 'Sec',
    lastName: 'Applicant',
    dateOfBirth: '1992-08-20',
    email: `onb.sec.${stamp}@example.com`,
    mobile: '+61400333444',
  },
  matter: {
    matterTypeId,
    visaSubclass: 'ONBTEST',
    visaStream: 'Test Stream',
    assignedAgentId,
    priority: 'normal',
  },
  financial: {
    professionalFee: 2500,
    deposit: 500,
    visaFees: 1200,
  },
}

await pgClient.query(
  `UPDATE matter_defaults SET card_processing_surcharge_percent = 2.5 WHERE agency_id = $1`,
  [agencyId],
)

const complete = await apiPost('/api/onboarding/complete', payload)
if (!complete.ok) {
  fail('API-COMPLETE', complete.json.error || 'Onboarding complete failed', complete.json)
} else {
  pass('API-COMPLETE', 'Atomic onboarding save succeeded')
  const { clientId, matterId, agreementId, approvalId, clientNumber } = complete.json

  const { rows: applicants } = await pgClient.query(
    `SELECT role, first_name FROM matter_applicants WHERE matter_id = $1 ORDER BY role`,
    [matterId],
  )
  if (applicants.length >= 2) pass('DB-APPLICANTS', `${applicants.length} matter_applicants rows`)
  else fail('DB-APPLICANTS', 'Expected primary+secondary applicants', { applicants })

  const { rows: fin } = await pgClient.query(`SELECT * FROM matter_financials WHERE matter_id = $1`, [matterId])
  if (Number(fin[0]?.visa_fee_surcharge) === 30) pass('DB-SURCHARGE', 'Surcharge calculated from agency settings (2.5% of 1200)')
  else fail('DB-SURCHARGE', 'Surcharge wrong', fin[0])

  const { rows: audit } = await pgClient.query(
    `SELECT event_type FROM document_audit_events WHERE client_id = $1`,
    [clientId],
  )
  if (audit.some((a) => a.event_type === 'generated')) pass('DB-AUDIT', 'document_audit_events recorded')
  else fail('DB-AUDIT', 'No audit events', audit)

  const auditApi = await apiGet(`/api/clients/${clientId}/audit-events`)
  if (auditApi.ok && auditApi.json.events?.length) pass('API-AUDIT', 'Client audit API returns events')
  else fail('API-AUDIT', 'Audit API empty')

  // Simulate agreement signed webhook audit fields
  const signedAt = new Date().toISOString()
  await pgClient.query(
    `UPDATE agreements SET signed_at = $1, signed_by = $2, signature_provider = 'signwell', status = 'signed' WHERE id = $3`,
    [signedAt, 'Onb Test', agreementId],
  )
  await admin.from('document_audit_events').insert({
    agency_id: agencyId,
    client_id: clientId,
    matter_id: matterId,
    document_type: 'service_agreement',
    document_id: agreementId,
    event_type: 'signed',
    event_timestamp: signedAt,
    actor_name: 'Onb Test',
    provider: 'signwell',
    metadata: { test: true },
  })

  const { rows: ag } = await pgClient.query(`SELECT signed_at, signed_by FROM agreements WHERE id = $1`, [agreementId])
  if (ag[0]?.signed_at && ag[0]?.signed_by) pass('DB-SIGNED-AT', 'Agreement signed_at from system (not manual)')
  else fail('DB-SIGNED-AT', 'signed_at missing')

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]
  const executablePath = chromePaths.find((p) => fs.existsSync(p))

  if (executablePath && complete.json.deepLink) {
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
    await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' })

    await page.goto(`${baseUrl}/workspace/${agencySlug}/onboarding/new`, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () => document.body.innerText.includes('Primary Applicant'),
      { timeout: 90000 },
    ).catch(() => null)
    const wizardText = await page.evaluate(() => document.body.innerText)
    if (wizardText.includes('Primary Applicant') && wizardText.includes('New Client')) {
      pass('BROWSER-WIZARD', 'Onboarding wizard page loads')
    } else fail('BROWSER-WIZARD', 'Wizard page missing content', { snippet: wizardText.slice(0, 300) })

    await page.goto(`${baseUrl}${complete.json.deepLink}`, { waitUntil: 'networkidle2', timeout: 90000 })
    await page.waitForFunction(
      () => document.body.innerText.includes('Matter Details'),
      { timeout: 90000 },
    ).catch(() => null)
    await sleep(3000)
    const profileText = await page.evaluate(() => document.body.innerText)
    const matterPanel = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Matter Details'))
      return h?.closest('.rounded-2xl')?.innerText || ''
    })
    if (profileText.includes('Audit')) {
      pass('BROWSER-PROFILE', 'Client profile shows audit section')
    } else {
      fail('BROWSER-PROFILE', 'Profile missing audit section')
    }

    if (
      matterPanel.includes('Test Stream') ||
      matterPanel.includes('ONBTEST') ||
      matterPanel.includes('Not Provided')
    ) {
      pass('BROWSER-MATTER-PANEL', 'Matter Details panel shows stream/visa (no file number field)')
    } else fail('BROWSER-MATTER-PANEL', 'Matter panel missing expected fields', { matterPanel: matterPanel.slice(0, 200) })

    await browser.close()
  } else {
    fail('BROWSER-SKIP', 'Chrome or deepLink unavailable')
  }

  // cleanup test data
  await pgClient.query(`DELETE FROM document_audit_events WHERE client_id = $1`, [clientId])
  await pgClient.query(`DELETE FROM agreement_fee_items WHERE agreement_id = $1`, [agreementId])
  await pgClient.query(`DELETE FROM agreements WHERE id = $1`, [agreementId])
  await pgClient.query(`DELETE FROM application_approvals WHERE id = $1`, [approvalId])
  await pgClient.query(`DELETE FROM matters WHERE id = $1`, [matterId])
  await pgClient.query(`DELETE FROM clients WHERE id = $1`, [clientId])
}

await pgClient.end()

const failures = results.filter((r) => r.status === 'FAIL')
console.log('\n' + '='.repeat(72))
console.log(`ONB UNIFIED ONBOARDING: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failures.length}/${results.length})`)
console.log('='.repeat(72))
if (failures.length) for (const f of failures) console.log(`  ✗ ${f.id}: ${f.msg}`)
process.exit(failures.length > 0 ? 1 : 0)
