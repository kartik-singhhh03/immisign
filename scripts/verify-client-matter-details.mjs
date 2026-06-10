/**
 * Client Profile Matter Details verification
 * Usage: node scripts/verify-client-matter-details.mjs [baseUrl] [agencySlug] [clientId]
 */
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const env = loadEnv()
const baseUrl = process.argv[2] || 'http://localhost:3000'
const targetSlug = process.argv[3] || 'ritiklabs'
const clientIdArg = process.argv[4]

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const checks = []
function pass(name, detail = '') { checks.push({ name, ok: true, detail }) }
function fail(name, detail = '') { checks.push({ name, ok: false, detail }) }

// DB checks
const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const dbUrl = `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`
const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await pgClient.connect()
  const { rows } = await pgClient.query(`
    SELECT column_name, table_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name = 'agreements' AND column_name = 'visa_stream')
        OR (table_name = 'application_approvals' AND column_name = 'visa_stream'))
  `)
  if (rows.length >= 2) pass('DB visa_stream columns', 'agreements + application_approvals')
  else fail('DB visa_stream columns', `found ${rows.length}/2`)
} catch (e) {
  fail('DB connection', e.message)
} finally {
  await pgClient.end().catch(() => {})
}

// Resolve client
const { data: agencyRow } = await admin.from('agencies').select('id, slug').eq('slug', targetSlug).maybeSingle()
if (!agencyRow) throw new Error(`Agency ${targetSlug} not found`)

let clientId = clientIdArg
if (!clientId) {
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('agency_id', agencyRow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  clientId = client?.id
}

if (!clientId) {
  fail('client resolve', 'no client found')
} else {
  // API check with auth
  const { data: owner } = await admin.from('users').select('email').eq('agency_id', agencyRow.id).limit(1).maybeSingle()
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email })
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: sessionData } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })

  const token = sessionData.session.access_token
  const apiRes = await fetch(`${baseUrl}/api/clients/${clientId}/matter-context`, {
    headers: { Authorization: `Bearer ${token}`, Cookie: '' },
  })

  // Try cookie-based if bearer fails
  let context = null
  if (apiRes.ok) {
    const json = await apiRes.json()
    context = json.context
    pass('matter-context API', `stage=${context?.currentStage}`)
  } else {
    // session via chrome for API
    fail('matter-context API', `HTTP ${apiRes.status}`)
  }

  if (context) {
    if (context.fileNumber || context.matters?.length) pass('file number resolved', context.fileNumber || 'from matters')
    else fail('file number resolved', 'empty')
    if (context.compliance?.total === 4) pass('compliance gates', `${context.compliance.completed}/4`)
    else fail('compliance gates', `total=${context.compliance?.total}`)
    if (context.workflowTimeline?.length === 7) pass('workflow timeline', '7 stages')
    else fail('workflow timeline', `len=${context.workflowTimeline?.length}`)
    if (context.nextAction?.label) pass('next action', context.nextAction.label)
    else fail('next action', 'missing')
  }

  // Browser audit
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

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]
  const executablePath = chromePaths.find((p) => fs.existsSync(p))

  if (executablePath) {
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.setCookie({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' })

    await page.goto(`${baseUrl}/workspace/${targetSlug}/clients/${clientId}`, { waitUntil: 'networkidle2', timeout: 90000 })
    await sleep(5000)

    const text = await page.evaluate(() => document.body.innerText)
    if (/matter details/i.test(text)) pass('browser matter details panel', 'visible')
    else fail('browser matter details panel', 'not found')

    if (/compliance status/i.test(text) && /complete/i.test(text)) pass('browser compliance widget', 'visible')
    else fail('browser compliance widget', 'not found')

    if (/workflow progress/i.test(text)) pass('browser workflow timeline', 'visible')
    else fail('browser workflow timeline', 'not found')

    if (/what happens next/i.test(text)) pass('browser next action', 'visible')
    else fail('browser next action', 'not found')

    if (/% compliant/i.test(text)) pass('browser header compliance', 'visible')
    else fail('browser header compliance', 'not found')

    await browser.close()
  } else {
    fail('browser audit', 'Chrome not found')
  }
}

console.log('\n=== Client Matter Details Verification ===\n')
const failed = checks.filter((c) => !c.ok)
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed`)
process.exit(failed.length ? 1 : 0)
