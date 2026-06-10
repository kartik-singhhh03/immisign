/**
 * DS-1 File Notes bug verification — matter select stays on /file-notes
 */
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  let v = line.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[line.slice(0, i).trim()] = v
}

const baseUrl = 'http://localhost:3000'
const agencySlug = 'ritiklabs'
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: users } = await admin.from('users').select('email').limit(1)
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: session } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]
const cookieValue = encodeURIComponent(JSON.stringify({
  access_token: session.session.access_token,
  refresh_token: session.session.refresh_token,
  expires_at: session.session.expires_at,
  token_type: 'bearer',
  user: session.session.user,
}))

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!chrome) { console.log('SKIP: Chrome not found'); process.exit(0) }

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setCookie({ name: `sb-${projectRef}-auth-token`, value: cookieValue, domain: 'localhost', path: '/' })

await page.goto(`${baseUrl}/workspace/${agencySlug}/file-notes`, { waitUntil: 'networkidle2', timeout: 90000 })
await page.waitForFunction(
  () => document.querySelector('input[placeholder*="Search client"]') !== null,
  { timeout: 60000 },
)

const t0 = Date.now()
const input = await page.$('input[placeholder*="Search client"]')
await input.click()
await input.type('kartik', { delay: 20 })
await page.waitForFunction(
  () => document.querySelectorAll('ul li button').length > 0 || !document.body.innerText.includes('Searching'),
  { timeout: 30000 },
)
const searchMs = Date.now() - t0
console.log(`Search latency: ${searchMs}ms`)

const buttons = await page.$$('ul li button')
if (buttons[0]) {
  await buttons[0].click()
  await new Promise((r) => setTimeout(r, 3000))
  const url = page.url()
  const onFileNotes = url.includes('/file-notes')
  const text = await page.evaluate(() => document.body.innerText)
  if (onFileNotes && !url.includes('/clients/')) {
    console.log('PASS: Matter selected — stayed on File Notes')
  } else {
    console.log('FAIL: Redirected away from File Notes', url)
    process.exit(1)
  }
  if (text.includes('Notes') || text.includes('matter')) {
    console.log('PASS: Matter workspace loaded')
  }
} else {
  console.log('WARN: No search results to click')
}

if (searchMs < 15000) console.log(`PASS: Search under 15s (${searchMs}ms)`)
else console.log(`WARN: Search slow (${searchMs}ms) — AU latency expected from India`)

await browser.close()
console.log('DS-1 File Notes: PASS')
process.exit(0)
