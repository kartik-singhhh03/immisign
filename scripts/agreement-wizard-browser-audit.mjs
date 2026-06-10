/**
 * Agreement Wizard UX browser audit
 * Usage: node scripts/agreement-wizard-browser-audit.mjs [baseUrl] [agencySlug]
 */
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'

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

const results = {
  wizardLoad: { pass: false, detail: '' },
  stickySidebar: { pass: false, detail: '' },
  matterTypeModal: { pass: false, detail: '' },
  feeTable: { pass: false, detail: '' },
  autosaveIndicator: { pass: false, detail: '' },
  previewWorkspace: { pass: false, detail: '' },
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: agencyRow } = await admin.from('agencies').select('id, slug').eq('slug', targetSlug).maybeSingle()
if (!agencyRow) throw new Error(`Agency not found: ${targetSlug}`)

const { data: owner } = await admin
  .from('users')
  .select('email')
  .eq('agency_id', agencyRow.id)
  .limit(1)
  .maybeSingle()

const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: owner.email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
})

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
if (!executablePath) throw new Error('Chrome not found')

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.setCookie({
  name: cookieName,
  value: cookieValue,
  domain: 'localhost',
  path: '/',
})

const wizardUrl = `${baseUrl}/workspace/${targetSlug}/agreements/new`
await page.goto(wizardUrl, { waitUntil: 'networkidle2', timeout: 60000 })

const bodyText = await page.evaluate(() => document.body.innerText)
if (/agreement setup/i.test(bodyText)) {
  results.wizardLoad.pass = true
  results.wizardLoad.detail = 'Wizard page loaded'
} else {
  results.wizardLoad.detail = 'Title not found'
}

if (/grand total/i.test(bodyText) && /fee totals/i.test(bodyText)) {
  results.stickySidebar.pass = true
  results.stickySidebar.detail = 'Sticky sidebar fee totals visible'
} else if (/agreement setup/i.test(bodyText)) {
  results.stickySidebar.detail = 'Sidebar hidden or fee totals not rendered yet'
}

if (/unsaved|saved|saving|draft autosave/i.test(bodyText)) {
  results.autosaveIndicator.pass = true
  results.autosaveIndicator.detail = 'Autosave indicator present'
}

async function clickContinue() {
  const btns = await page.$$('button')
  for (const btn of btns) {
    const t = await page.evaluate((el) => el.textContent, btn)
    const disabled = await page.evaluate((el) => el.disabled, btn)
    if (!disabled && t && /continue/i.test(t) && !/proceed|send/i.test(t)) {
      await btn.click()
      await sleep(900)
      return true
    }
  }
  return false
}

// Fill minimal client fields so Continue is enabled
await page.type('input[type="email"], input[placeholder*="email" i]', 'wizard-audit@test.local', { delay: 10 }).catch(() => {})
const inputs = await page.$$('input')
for (const input of inputs) {
  const ph = await page.evaluate((el) => el.getAttribute('placeholder') || '', input)
  const label = await page.evaluate((el) => el.closest('label')?.innerText || '', input)
  if (/name/i.test(ph + label) && !/email/i.test(ph + label)) {
    await input.click({ clickCount: 3 })
    await input.type('Wizard Audit Client', { delay: 10 })
  }
}

await clickContinue()

const matterText = await page.evaluate(() => document.body.innerText)
if (/matter details/i.test(matterText)) {
  if (/create matter type|manage matter types|no matter types configured|matter type \*/i.test(matterText)) {
    results.matterTypeModal.pass = true
    results.matterTypeModal.detail = 'Matter type modal entry (no settings redirect)'
  } else {
    results.matterTypeModal.detail = 'Matter step loaded but modal CTA missing'
  }
}

// Select first matter type if dropdown has options
await page.evaluate(() => {
  const selects = [...document.querySelectorAll('select')]
  const matterSel = selects.find((s) => /matter type|select matter/i.test(s.closest('label')?.innerText || '')) || selects[1] || selects[0]
  if (matterSel && matterSel.options.length > 1) {
    matterSel.selectedIndex = 1
    matterSel.dispatchEvent(new Event('change', { bubbles: true }))
  }
})
await sleep(400)
await clickContinue()

// Fees step
await clickContinue()

const feesText = await page.evaluate(() => document.body.innerText)
const onFeesStep = /build your fee structure|dynamic fee|add row/i.test(feesText)
if (onFeesStep && /due trigger/i.test(feesText) && !/payment schedule/i.test(feesText.toLowerCase())) {
  results.feeTable.pass = true
  results.feeTable.detail = 'Dynamic fee table present, payment schedule dropdown removed'
} else {
  results.feeTable.detail = feesText.slice(0, 200)
}

// Fees → add row
for (const btn of await page.$$('button')) {
  const t = await page.evaluate((el) => el.textContent, btn)
  if (t && /add row/i.test(t)) { await btn.click(); break }
}
await sleep(500)

// Add fee row with amount for continue
for (const btn of await page.$$('button')) {
  const t = await page.evaluate((el) => el.textContent, btn)
  if (t && /add row/i.test(t)) { await btn.click(); break }
}
await sleep(300)
const feeInputs = await page.$$('input')
if (feeInputs.length >= 2) {
  await feeInputs[0].type('Professional Fee', { delay: 5 })
  await feeInputs[1].type('4500', { delay: 5 })
}
await clickContinue() // Terms
await clickContinue() // Preview
await sleep(8000)

const previewText = await page.evaluate(() => document.body.innerText)
const hasPdfFrame = await page.evaluate(() => Boolean(document.querySelector('iframe[title*="Agreement" i], iframe[title*="PDF" i], iframe[title*="preview" i]')))
if (/document review|review full agreement|generating pdf|fee summary/i.test(previewText) || hasPdfFrame) {
  results.previewWorkspace.pass = true
  results.previewWorkspace.detail = hasPdfFrame ? 'PDF iframe rendered' : 'Preview workspace loaded'
} else {
  results.previewWorkspace.detail = previewText.slice(0, 300)
}

await browser.close()

console.log('\n=== Agreement Wizard Browser Audit ===\n')
let passed = 0
for (const [key, r] of Object.entries(results)) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${key} — ${r.detail}`)
  if (r.pass) passed++
}
console.log(`\n${passed}/${Object.keys(results).length} passed`)
process.exit(passed === Object.keys(results).length ? 0 : 1)
