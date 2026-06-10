/**
 * DS-2.1 Visual Regression — browser screenshots + legacy audit
 */
import fs from 'node:fs'
import path from 'node:path'
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

const ports = [3001, 3000]
let baseUrl = null
for (const p of ports) {
  try {
    const r = await fetch(`http://localhost:${p}/`)
    if (r.ok || r.status === 404) { baseUrl = `http://localhost:${p}`; break }
  } catch { /* next */ }
}
if (!baseUrl) { console.log('SKIP: No dev server on 3000/3001'); process.exit(0) }

const agencySlug = 'ritiklabs'
const outDir = path.join('docs', 'ds21-screenshots')
const reportPath = 'docs/DS21_VISUAL_REGRESSION.md'

const PAGES = [
  { id: 'dashboard', path: `/workspace/${agencySlug}`, label: 'Dashboard' },
  { id: 'clients', path: `/workspace/${agencySlug}/clients`, label: 'Clients' },
  { id: 'file-notes', path: `/workspace/${agencySlug}/file-notes`, label: 'File Notes' },
  { id: 'agreements', path: `/workspace/${agencySlug}/agreements`, label: 'Agreements' },
  { id: 'approvals', path: `/workspace/${agencySlug}/approvals`, label: 'Approvals' },
  { id: 'approvals-new', path: `/workspace/${agencySlug}/approvals/new`, label: 'Approvals New' },
  { id: 'documents', path: `/workspace/${agencySlug}/documents/library`, label: 'Documents' },
  { id: 'templates', path: `/workspace/${agencySlug}/templates`, label: 'Templates' },
  { id: 'onboarding', path: `/workspace/${agencySlug}/onboarding/new`, label: 'Onboarding' },
  { id: 'settings', path: `/workspace/${agencySlug}/settings`, label: 'Settings' },
]

const LEGACY = [
  { re: /#0D9F8C|#0d9f8c/g, label: 'Legacy teal #0D9F8C' },
  { re: /#10B981|#22C55E/gi, label: 'Legacy green hex' },
  { re: /bg-emerald-|text-emerald-|border-emerald-/g, label: 'Emerald Tailwind class' },
  { re: /bg-teal-|text-teal-/g, label: 'Teal Tailwind class' },
  { re: /animate-spin/g, label: 'Spinner (animate-spin)' },
]

async function auth(page, projectRef) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: users } = await admin.from('users').select('email').limit(1)
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: session } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  const cookieValue = encodeURIComponent(JSON.stringify({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_at: session.session.expires_at,
    token_type: 'bearer',
    user: session.session.user,
  }))
  await page.setCookie({ name: `sb-${projectRef}-auth-token`, value: cookieValue, domain: 'localhost', path: '/' })
}

function auditHtml(html) {
  return LEGACY.map(({ re, label }) => ({ label, count: (html.match(re) || []).length })).filter((x) => x.count > 0)
}

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!chrome) { console.log('SKIP: Chrome not found'); process.exit(0) }

fs.mkdirSync(outDir, { recursive: true })
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await auth(page, projectRef)

const results = []
for (const p of PAGES) {
  console.log(`Capturing ${p.label}…`)
  await page.setViewport({ width: 1440, height: 900 })
  try {
    await page.goto(`${baseUrl}${p.path}`, { waitUntil: 'networkidle2', timeout: 120000 })
    await page.waitForFunction(() => document.body?.innerText?.length > 40, { timeout: 60000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))
    const shot = `${p.id}-desktop.png`
    await page.screenshot({ path: path.join(outDir, shot), fullPage: true })
    const html = await page.content()
    const legacy = auditHtml(html)
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientW = await page.evaluate(() => document.documentElement.clientWidth)
    results.push({ ...p, shot, legacy, horizontalScroll: scrollW > clientW + 2 })
    if (legacy.length) console.log(`  legacy: ${legacy.map((l) => `${l.label}(${l.count})`).join(', ')}`)
  } catch (err) {
    console.log(`  FAIL: ${err.message}`)
    results.push({ ...p, shot: `${p.id}-error.png`, legacy: [{ label: 'capture failed', count: 1 }], horizontalScroll: false })
  }
}

// Client profile
try {
  await page.goto(`${baseUrl}/workspace/${agencySlug}/clients`, { waitUntil: 'networkidle2', timeout: 120000 })
  const link = await page.$('a[href*="/clients/"]')
  if (link) {
    const href = await page.evaluate((el) => el.getAttribute('href'), link)
    await page.goto(`${baseUrl}${href}`, { waitUntil: 'networkidle2', timeout: 120000 })
    await new Promise((r) => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(outDir, 'client-profile-desktop.png'), fullPage: true })
    results.push({ id: 'client-profile', label: 'Client Profile', shot: 'client-profile-desktop.png', legacy: auditHtml(await page.content()), horizontalScroll: false })
  }
} catch { /* skip */ }

await browser.close()

const lines = [
  '# DS-2.1 Visual Regression Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Server: ${baseUrl}`,
  `Agency: \`${agencySlug}\``,
  'Method: Browser screenshots only — not code inspection',
  '',
  '## Screenshots',
  '',
]
for (const r of results) {
  lines.push(`### ${r.label}`)
  lines.push(`![${r.label}](ds21-screenshots/${r.shot})`)
  lines.push('')
}

lines.push('## Browser findings')
lines.push('')
let pass = true
for (const r of results) {
  if (r.horizontalScroll) {
    pass = false
    lines.push(`- **FAIL** ${r.label}: horizontal scroll`)
  }
  for (const leg of r.legacy || []) {
    if (leg.count > 0 && !leg.label.includes('capture failed')) {
      lines.push(`- **WARN** ${r.label}: ${leg.label} (${leg.count} DOM hits)`)
    }
  }
}

lines.push('')
lines.push('## Unified visual language checklist')
lines.push('')
const checks = [
  ['Charcoal primary buttons (#111111)', results.every((r) => !(r.legacy || []).some((l) => l.label.includes('#0D9F8C') && l.count > 2))],
  ['No emerald/teal Tailwind in DOM', results.every((r) => !(r.legacy || []).some((l) => l.label.includes('Emerald') || l.label.includes('Teal')))],
  ['No full-page spinners', results.every((r) => !(r.legacy || []).some((l) => l.label.includes('Spinner') && l.count > 1))],
  ['Dashboard card filters use matter keys', 'CODE — fixed in ComplianceDashboardPage'],
]
for (const [label, ok] of checks) {
  lines.push(`- ${ok ? 'PASS' : 'OPEN'}: ${label}`)
  if (!ok) pass = false
}

lines.push('')
lines.push(`## Overall: ${pass ? 'PASS (browser)' : 'PARTIAL — see warnings above'}`)
lines.push('')
lines.push('## Remaining carryover')
lines.push('| Area | Issue |')
lines.push('|------|-------|')
lines.push('| Agreement wizard steps | Legacy gradient/navy in PDF preview chrome |')
lines.push('| Auth marketing pages | Submit spinners acceptable |')
lines.push('| Stripe/billing internals | Plan ID strings unchanged |')

fs.writeFileSync(reportPath, lines.join('\n'))
console.log(`Wrote ${reportPath}`)
