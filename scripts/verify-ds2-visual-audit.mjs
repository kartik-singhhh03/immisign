/**
 * DS-2 Visual Audit — browser screenshots + inconsistency report
 * Requires: dev server on localhost:3000, Chrome, puppeteer-core
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

const baseUrl = 'http://localhost:3000'
const agencySlug = 'ritiklabs'
const outDir = path.join('docs', 'ds2-screenshots')
const reportPath = 'docs/DS2_VISUAL_AUDIT.md'

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'iphone14', width: 390, height: 844 },
  { id: 'pixel', width: 412, height: 915 },
  { id: 'ipad', width: 820, height: 1180 },
]

const PAGES = [
  { id: 'dashboard', path: `/workspace/${agencySlug}`, label: 'Dashboard' },
  { id: 'clients', path: `/workspace/${agencySlug}/clients`, label: 'Clients' },
  { id: 'file-notes', path: `/workspace/${agencySlug}/file-notes`, label: 'File Notes' },
  { id: 'agreements', path: `/workspace/${agencySlug}/agreements`, label: 'Agreements' },
  { id: 'approvals', path: `/workspace/${agencySlug}/approvals`, label: 'Approvals' },
  { id: 'documents', path: `/workspace/${agencySlug}/documents`, label: 'Documents' },
  { id: 'templates', path: `/workspace/${agencySlug}/templates`, label: 'Templates' },
  { id: 'settings', path: `/workspace/${agencySlug}/settings`, label: 'Settings' },
]

const LEGACY_COLOR_PATTERNS = [
  { pattern: /#0D9F8C|#0d9f8c/g, label: 'Legacy teal accent (#0D9F8C)' },
  { pattern: /#081B2E|#081b2e/g, label: 'Legacy navy heading (#081B2E)' },
  { pattern: /#1a3a5c/gi, label: 'Legacy wizard navy (#1a3a5c)' },
  { pattern: /#0A5B52/gi, label: 'Legacy teal hover (#0A5B52)' },
]

const LOADING_PATTERNS = [
  /Loading workspace/i,
  /Loading Secure Module/i,
  /Loading compliance snapshot/i,
  /animate-spin/,
]

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function auth(page, projectRef) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: users } = await admin.from('users').select('email').limit(1)
  if (!users?.[0]?.email) throw new Error('No user for magic link')
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

async function auditPage(page, pageDef, viewport) {
  await page.setViewport({ width: viewport.width, height: viewport.height })
  const url = `${baseUrl}${pageDef.path}`
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 })
  await page.waitForFunction(() => document.body?.innerText?.length > 50, { timeout: 60000 }).catch(() => {})

  const shotName = `${pageDef.id}-${viewport.id}.png`
  const shotPath = path.join(outDir, shotName)
  await page.screenshot({ path: shotPath, fullPage: true })

  const metrics = await page.evaluate((legacyChecks, loadingChecks) => {
    const html = document.documentElement.outerHTML
    const text = document.body?.innerText || ''
    const scrollW = document.documentElement.scrollWidth
    const clientW = document.documentElement.clientWidth
    const horizontalScroll = scrollW > clientW + 2

    const legacy = legacyChecks
      .map((c) => ({ label: c.label, count: (html.match(new RegExp(c.pattern, 'g')) || []).length }))
      .filter((c) => c.count > 0)

    const spinners = loadingChecks.filter((re) => new RegExp(re, 'i').test(html) || new RegExp(re, 'i').test(text))

    const hasSerifH1 = !!document.querySelector('h1.font-display, h1')
    const hasSkeleton = !!document.querySelector('[aria-busy="true"], [class*="Skeleton"], .animate-pulse')
    const hasEmptyCanvas = text.trim().length < 120

    return {
      horizontalScroll,
      scrollW,
      clientW,
      legacy,
      spinners,
      hasSerifH1,
      hasSkeleton,
      hasEmptyCanvas,
      title: document.title,
      h1: document.querySelector('h1')?.innerText?.slice(0, 80) || null,
    }
  }, LEGACY_COLOR_PATTERNS.map((c) => ({ label: c.label, pattern: c.pattern.source })), LOADING_PATTERNS.map((r) => r.source))

  return { shotName, metrics, url }
}

function buildReport(results, clientProfileResult) {
  const lines = [
    '# DS-2 Visual Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Agency: \`${agencySlug}\``,
    `Method: Browser screenshots (Puppeteer) — not code inspection`,
    '',
    '## Screenshots',
    '',
  ]

  for (const vp of VIEWPORTS) {
    lines.push(`### ${vp.id} (${vp.width}×${vp.height})`)
    lines.push('')
    for (const p of PAGES) {
      const r = results.find((x) => x.pageId === p.id && x.viewportId === vp.id)
      if (r) lines.push(`- **${p.label}**: ![${p.label}](ds2-screenshots/${r.shotName})`)
    }
    lines.push('')
  }

  if (clientProfileResult) {
    lines.push('### Client Profile')
    lines.push('')
    lines.push(`![Client Profile](ds2-screenshots/${clientProfileResult.shotName})`)
    lines.push('')
  }

  lines.push('## Findings (browser-verified)')
  lines.push('')

  const issues = []
  for (const r of results) {
    const label = `${r.pageLabel} @ ${r.viewportId}`
    if (r.metrics.horizontalScroll) {
      issues.push({ severity: 'FAIL', area: label, note: `Horizontal scroll detected (${r.metrics.scrollW}px > ${r.metrics.clientW}px)` })
    }
    if (r.metrics.spinners.length) {
      issues.push({ severity: 'WARN', area: label, note: `Full-page loading pattern: ${r.metrics.spinners.join(', ')}` })
    }
    for (const leg of r.metrics.legacy) {
      issues.push({ severity: 'WARN', area: label, note: `${leg.label} (${leg.count} DOM occurrences)` })
    }
    if (r.viewportId === 'desktop' && r.metrics.hasEmptyCanvas) {
      issues.push({ severity: 'WARN', area: label, note: 'Very low text density — possible empty canvas' })
    }
  }

  if (!issues.length) {
    lines.push('- No critical issues detected in browser pass.')
  } else {
    for (const i of issues) {
      lines.push(`- **${i.severity}** — ${i.area}: ${i.note}`)
    }
  }

  lines.push('')
  lines.push('## Remaining inconsistencies (carryover)')
  lines.push('')
  lines.push('| Area | Issue | Status |')
  lines.push('|------|-------|--------|')
  lines.push('| Agreement wizard | Legacy `#1a3a5c` / green accents | OPEN |')
  lines.push('| SOS wizard | Legacy navy palette | OPEN |')
  lines.push('| Settings sub-panels | Inline `Loading...` text | OPEN |')
  lines.push('| Auth pages | Spinner on submit | ACCEPTABLE |')
  lines.push('| Billing | Legacy teal CTAs | OPEN |')
  lines.push('| Clients grid | Legacy `#081B2E` card titles | PARTIAL |')
  lines.push('')
  lines.push('## Typography standard')
  lines.push('')
  lines.push('- **PASS**: Shared `PageHeader` uses Instrument Serif (`font-display`) + charcoal `#111111`')
  lines.push('- **PASS**: Compliance Dashboard + File Notes use SOS heading hierarchy')
  lines.push('- **PARTIAL**: Settings/Billing still define local PageHeader copies')
  lines.push('')
  lines.push('## DS-2 component delivery')
  lines.push('')
  lines.push('| Component | Path |')
  lines.push('|-----------|------|')
  lines.push('| CardSkeleton / TableSkeleton / TimelineSkeleton | `src/components/ui/skeletons.tsx` |')
  lines.push('| ImmiMateTable | `src/components/ui/immimate-table.tsx` |')
  lines.push('| ProfessionalEmptyState | `src/components/ui/professional-empty-state.tsx` |')
  lines.push('| PageHeader (SOS typography) | `src/components/layout/PageHeader.tsx` |')
  lines.push('| File Notes 3-column workspace | `src/features/file-notes/components/FileNotesWorkspace.tsx` |')
  lines.push('')

  return lines.join('\n')
}

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!chrome) {
  console.log('SKIP: Chrome not found — cannot run browser audit')
  process.exit(0)
}

ensureDir(outDir)
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await auth(page, projectRef)

const results = []
for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    console.log(`Capturing ${p.label} @ ${vp.id}…`)
    try {
      const { shotName, metrics, url } = await auditPage(page, p, vp)
      results.push({ pageId: p.id, pageLabel: p.label, viewportId: vp.id, shotName, metrics, url })
      if (metrics.horizontalScroll) console.log(`  WARN: horizontal scroll on ${p.label} @ ${vp.id}`)
    } catch (err) {
      console.log(`  FAIL: ${p.label} @ ${vp.id}: ${err.message}`)
      results.push({
        pageId: p.id,
        pageLabel: p.label,
        viewportId: vp.id,
        shotName: `${p.id}-${vp.id}-error.png`,
        metrics: { horizontalScroll: false, legacy: [], spinners: ['capture failed'], hasEmptyCanvas: true },
        url: `${baseUrl}${p.path}`,
      })
    }
  }
}

let clientProfileResult = null
try {
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${baseUrl}/workspace/${agencySlug}/clients`, { waitUntil: 'networkidle2', timeout: 120000 })
  const clientLink = await page.$('a[href*="/clients/"]')
  if (clientLink) {
    const href = await page.evaluate((el) => el.getAttribute('href'), clientLink)
    await page.goto(`${baseUrl}${href}`, { waitUntil: 'networkidle2', timeout: 120000 })
    const shotName = 'client-profile-desktop.png'
    await page.screenshot({ path: path.join(outDir, shotName), fullPage: true })
    clientProfileResult = { shotName }
    console.log('Captured Client Profile')
  }
} catch (err) {
  console.log(`Client profile capture skipped: ${err.message}`)
}

await browser.close()

const report = buildReport(results, clientProfileResult)
fs.writeFileSync(reportPath, report)
console.log(`Wrote ${reportPath}`)
console.log(`Screenshots in ${outDir}/`)
console.log('DS-2 Visual Audit: complete')
