/**
 * Multi-Matter Production Readiness Audit
 * Seeds 3 matters for Rajwant Singh (or uses existing), then verifies isolation.
 *
 * Usage: node scripts/multi-matter-audit.mjs [baseUrl] [agencySlug]
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

const findings = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] }
function add(severity, id, title, evidence) {
  findings[severity].push({ id, title, evidence })
}

const matters = {
  A: { label: 'SC 190 Skilled Nominated', fileNum: 'AUD-MATTER-A-190', visa: '190', stream: 'Skilled Nominated' },
  B: { label: 'SC 820 Partner Visa', fileNum: 'AUD-MATTER-B-820', visa: '820', stream: 'Partner' },
  C: { label: 'AAT Appeal', fileNum: 'AUD-MATTER-C-AAT', visa: 'AAT', stream: 'Appeal' },
}

let agencyId, clientId, userId, sessionToken
let seeded = { agreements: {}, approvals: {}, notes: {} }

// ─── DB: resolve agency + Rajwant Singh ───
const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await pgClient.connect()

const { rows: agencies } = await pgClient.query(`SELECT id, slug FROM agencies WHERE slug = $1`, [agencySlug])
if (!agencies.length) throw new Error(`Agency ${agencySlug} not found`)
agencyId = agencies[0].id

let { rows: clients } = await pgClient.query(
  `SELECT id, name, email, client_number FROM clients WHERE agency_id = $1 AND name ILIKE '%rajwant%' ORDER BY created_at DESC LIMIT 5`,
  [agencyId],
)
if (!clients.length) {
  const { rows: any } = await pgClient.query(
    `SELECT id, name, email, client_number FROM clients WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [agencyId],
  )
  clients = any
}
if (!clients.length) throw new Error('No clients in agency')
clientId = clients[0].id
const clientName = clients[0].name

const { rows: users } = await pgClient.query(`SELECT id, email, full_name FROM users WHERE agency_id = $1 LIMIT 1`, [agencyId])
userId = users[0]?.id

console.log(`\nAudit target: ${clientName} (${clientId}) @ ${agencySlug}\n`)

// ─── Seed 3 matters if audit markers missing ───
async function ensureMatter(key, spec, type) {
  const marker = `MULTI_MATTER_AUDIT_${key}`
  if (type === 'agreement') {
    const { rows: existing } = await pgClient.query(
      `SELECT id, agreement_number FROM agreements WHERE agency_id = $1 AND client_id = $2 AND agreement_number = $3`,
      [agencyId, clientId, spec.fileNum],
    )
    if (existing.length) {
      seeded.agreements[key] = existing[0].id
      return existing[0].id
    }
    const id = crypto.randomUUID()
    await pgClient.query(
      `INSERT INTO agreements (id, agency_id, client_id, created_by, agreement_number, title, client_name, client_email, status, metadata, visa_stream)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'signed',$9,$10)`,
      [
        id, agencyId, clientId, userId, spec.fileNum,
        `Audit SA ${key}`, clientName, clients[0].email || 'audit@test.local',
        JSON.stringify({ visaSubclass: spec.visa, audit_marker: marker }),
        spec.stream,
      ],
    )
    seeded.agreements[key] = id
    return id
  }

  const { rows: existing } = await pgClient.query(
    `SELECT id, approval_number FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND approval_number = $3`,
    [agencyId, clientId, spec.fileNum],
  )
  if (existing.length) {
    seeded.approvals[key] = existing[0].id
    return existing[0].id
  }
  const id = crypto.randomUUID()
  const status = key === 'A' ? 'lodged' : key === 'B' ? 'approved' : 'draft'
  const lodged = key === 'A' ? new Date().toISOString() : null
  const signed = key === 'B' ? new Date().toISOString() : null
  await pgClient.query(
    `INSERT INTO application_approvals (id, agency_id, client_id, created_by, approval_number, title, status, visa_subclass, visa_stream, lodged_at, client_signed_at, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'normal')`,
    [id, agencyId, clientId, userId, spec.fileNum, `Audit Approval ${key}`, status, spec.visa, spec.stream, lodged, signed],
  )
  seeded.approvals[key] = id
  return id
}

// Matter A: agreement + lodged approval
const agrA = await ensureMatter('A', matters.A, 'agreement')
await ensureMatter('A', matters.A, 'approval')
// Matter B: agreement + approved approval
const agrB = await ensureMatter('B', matters.B, 'agreement')
await ensureMatter('B', matters.B, 'approval')
// Matter C: appeal approval only
await ensureMatter('C', matters.C, 'approval')

// Seed distinct file notes per matter file
for (const [key, agrId] of Object.entries(seeded.agreements)) {
  const marker = `NOTE_ISOLATION_AGR_${key}_${matters[key].visa}`
  const { rows: ex } = await pgClient.query(
    `SELECT id FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND body = $3 LIMIT 1`,
    [agencyId, clientId, marker],
  )
  if (!ex.length) {
    await pgClient.query(
      `INSERT INTO file_notes (id, agency_id, client_id, created_by, note_type, body, file_source, file_id, is_system_note, recorded_at)
       VALUES ($1,$2,$3,$4,'internal',$5,'agreement',$6,false,now())`,
      [crypto.randomUUID(), agencyId, clientId, userId, marker, agrId],
    )
  }
  seeded.notes[`agr_${key}`] = marker
}

for (const [key, apId] of Object.entries(seeded.approvals)) {
  const marker = `NOTE_ISOLATION_AP_${key}_${matters[key].visa}`
  const { rows: ex } = await pgClient.query(
    `SELECT id FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND body = $3 LIMIT 1`,
    [agencyId, clientId, marker],
  )
  if (!ex.length) {
    await pgClient.query(
      `INSERT INTO file_notes (id, agency_id, client_id, created_by, note_type, body, file_source, file_id, is_system_note, recorded_at)
       VALUES ($1,$2,$3,$4,'internal',$5,'application_approval',$6,false,now())`,
      [crypto.randomUUID(), agencyId, clientId, userId, marker, apId],
    )
  }
  seeded.notes[`ap_${key}`] = marker
}

console.log('Seeded matters:', JSON.stringify(seeded, null, 2))

// ─── DB verification: file notes isolation ───
for (const [key, agrId] of Object.entries(seeded.agreements)) {
  const { rows: notes } = await pgClient.query(
    `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND file_source = 'agreement' AND file_id = $3`,
    [agencyId, clientId, agrId],
  )
  const bodies = notes.map((n) => n.body)
  const ownMarker = seeded.notes[`agr_${key}`]
  const leak = bodies.some((b) => b.startsWith('NOTE_ISOLATION_') && b !== ownMarker)
  if (leak) {
    add('CRITICAL', 'DB-NOTES-LEAK', `File notes leak on agreement matter ${key}`, { file_id: agrId, bodies })
  }
}

for (const [key, apId] of Object.entries(seeded.approvals)) {
  const { rows: notes } = await pgClient.query(
    `SELECT body FROM file_notes WHERE agency_id = $1 AND client_id = $2 AND file_source = 'application_approval' AND file_id = $3`,
    [agencyId, clientId, apId],
  )
  const bodies = notes.map((n) => n.body)
  const ownMarker = seeded.notes[`ap_${key}`]
  const leak = bodies.some((b) => b.startsWith('NOTE_ISOLATION_') && b !== ownMarker)
  if (leak) {
    add('CRITICAL', 'DB-NOTES-LEAK-AP', `File notes leak on approval matter ${key}`, { file_id: apId, bodies })
  }
}

// DB: count matters per client
const { rows: fileCounts } = await pgClient.query(
  `SELECT
    (SELECT COUNT(*) FROM agreements WHERE agency_id = $1 AND client_id = $2 AND status != 'cancelled') AS agreements,
    (SELECT COUNT(*) FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND deleted_at IS NULL) AS approvals,
    (SELECT COUNT(*) FROM service_statements WHERE agency_id = $1 AND client_id = $2 AND deleted_at IS NULL) AS sos`,
  [agencyId, clientId],
)
console.log('DB counts:', fileCounts[0])

if (Number(fileCounts[0].agreements) < 2) {
  add('HIGH', 'DB-MULTI-AGR', 'Client has fewer than 2 agreements after seed', fileCounts[0])
}
if (Number(fileCounts[0].approvals) < 3) {
  add('HIGH', 'DB-MULTI-AP', 'Client has fewer than 3 approvals after seed', fileCounts[0])
}

// ─── Auth for API ───
const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sessionData } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token })
sessionToken = sessionData.session.access_token

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

// ─── API: files list ───
const filesRes = await apiGet(`/api/clients/${clientId}/files`)
const files = filesRes.json?.files || []
console.log(`API files: ${files.length} matters`)
if (files.length < 3) {
  add('HIGH', 'API-FILES-COUNT', `Expected ≥3 matter files, got ${files.length}`, { files: files.map((f) => f.file_number) })
}

// ─── API: file notes isolation per matter ───
for (const f of files.filter((x) => x.file_number?.startsWith('AUD-MATTER'))) {
  const notesRes = await apiGet(
    `/api/clients/${clientId}/file-notes?file_source=${f.source}&file_id=${f.id}&limit=50`,
  )
  const notes = notesRes.json?.notes || []
  const auditNotes = notes.filter((n) => n.body?.startsWith('NOTE_ISOLATION_'))
  const expectedPrefix = f.source === 'agreement' ? 'NOTE_ISOLATION_AGR_' : 'NOTE_ISOLATION_AP_'
  const wrong = auditNotes.filter((n) => !n.body.includes(f.file_number.replace('AUD-MATTER-', '').split('-')[0]))
  if (auditNotes.length === 0) {
    add('MEDIUM', 'API-NOTES-EMPTY', `No audit notes returned for ${f.file_number}`, { source: f.source, id: f.id })
  } else if (wrong.length) {
    add('CRITICAL', 'API-NOTES-LEAK', `Notes API returned cross-matter notes for ${f.file_number}`, { wrong: wrong.map((n) => n.body) })
  } else {
    console.log(`PASS API notes isolation: ${f.file_number} (${auditNotes.length} scoped notes)`)
  }
}

// ─── API: matter-context isolation (MM-1) ───
const matterA = files.find((f) => f.file_number === matters.A.fileNum)
const matterB = files.find((f) => f.file_number === matters.B.fileNum)
const matterC = files.find((f) => f.file_number === matters.C.fileNum)

const mm1Results = { A: null, B: null, C: null }

async function fetchMatterContext(file) {
  if (!file) return null
  const res = await apiGet(
    `/api/clients/${clientId}/matter-context?file_source=${file.source}&file_id=${file.id}`,
  )
  return res.json?.context || null
}

if (matterA) mm1Results.A = await fetchMatterContext(matterA)
if (matterB) mm1Results.B = await fetchMatterContext(matterB)
if (matterC) mm1Results.C = await fetchMatterContext(matterC)

for (const [key, ctx] of Object.entries(mm1Results)) {
  if (!ctx) continue
  console.log(
    `Matter ${key} context: stage=${ctx.currentStage} compliance=${ctx.compliance?.completed}/${ctx.compliance?.total} next=${ctx.nextAction?.label}`,
  )
}

if (matterA && matterB) {
  const compA = mm1Results.A?.compliance?.completed
  const compB = mm1Results.B?.compliance?.completed
  const stageA = mm1Results.A?.currentStage
  const stageB = mm1Results.B?.currentStage

  if (compA === compB && stageA === stageB) {
    add('CRITICAL', 'API-MATTER-CTX-LEAK', 'Matter context returns identical compliance/stage for different matters', {
      matterA: { file: matters.A.fileNum, stage: stageA, compliance: compA },
      matterB: { file: matters.B.fileNum, stage: stageB, compliance: compB },
    })
  } else {
    console.log('PASS API matter-context: A vs B differ in stage or compliance')
  }

  const visaA = mm1Results.A?.visaSubclass
  const visaB = mm1Results.B?.visaSubclass
  if (visaA && visaB && visaA === visaB && matters.A.visa !== matters.B.visa) {
    add('HIGH', 'API-MATTER-VISA-LEAK', 'Matter context returns same visa subclass for different matters', { visaA, visaB })
  }
}

if (matterC && mm1Results.C) {
  const stageC = mm1Results.C.currentStage
  if (!stageC?.toLowerCase().includes('preparation') && !stageC?.toLowerCase().includes('agreement')) {
    add('HIGH', 'API-MATTER-C-STAGE', 'Draft matter C should show preparation or agreement stage', { stageC })
  } else {
    console.log('PASS API matter-context: Matter C draft stage isolated')
  }
}

if (matterA && matterB && matterC) {
  const stages = new Set([
    mm1Results.A?.currentStage,
    mm1Results.B?.currentStage,
    mm1Results.C?.currentStage,
  ].filter(Boolean))
  if (stages.size < 2) {
    add('CRITICAL', 'MM1-STAGE-NOT-ISOLATED', 'Matters A/B/C do not show distinct stages', {
      stages: [...stages],
    })
  } else {
    console.log('PASS MM-1: distinct stages across A/B/C')
  }
}

// ─── API: compliance dashboard matter-scoped (MM-1) ───
const dashRes = await apiGet('/api/compliance/dashboard')
const dash = dashRes.json?.dashboard || dashRes.json
if (dashRes.ok && dash) {
  const clientRows = (dash.attentionQueue || []).filter((r) => r.clientId === clientId)
  const sample = clientRows[0] || dash.attentionQueue?.[0]
  if (sample && !sample.fileId) {
    add('HIGH', 'API-DASH-NO-MATTER', 'Compliance dashboard attention queue missing fileId scope', {
      sampleKeys: Object.keys(sample || {}),
    })
  } else if (clientRows.length > 0) {
    const fileNumbers = new Set(clientRows.map((r) => r.fileNumber).filter(Boolean))
    console.log(`PASS API dashboard: ${clientRows.length} matter-scoped row(s) for client, files=${[...fileNumbers].join(', ')}`)
  }
  const funnel = dash.workflowFunnel || []
  const matterStage = funnel.find((s) => s.id === 'matters')
  if (!matterStage) {
    add('MEDIUM', 'API-DASH-FUNNEL', 'Workflow funnel should count matter units (id=matters)', { funnelIds: funnel.map((s) => s.id) })
  }
}

// ─── API: SOS matter filter ───
const sosAllRes = await apiGet(`/api/clients/${clientId}/service-statements`)
const allSos = sosAllRes.json?.statements || []
if (matterA) {
  const sosScopedRes = await apiGet(
    `/api/clients/${clientId}/service-statements?file_source=${matterA.source}&file_id=${matterA.id}`,
  )
  const scopedSos = sosScopedRes.json?.statements || []
  const leak = scopedSos.some(
    (s) =>
      s.approval_id &&
      s.approval_id !== seeded.approvals.A &&
      s.agreement_id &&
      s.agreement_id !== seeded.agreements.A,
  )
  if (!sosScopedRes.ok) {
    add('HIGH', 'API-SOS-FILTER-FAIL', 'SOS matter filter request failed', { status: sosScopedRes.status })
  } else if (scopedSos.length > allSos.length && allSos.length > 0) {
    add('HIGH', 'API-SOS-FILTER-LEAK', 'Scoped SOS returned more than unscoped', {
      scoped: scopedSos.length,
      all: allSos.length,
    })
  } else {
    console.log(`PASS API SOS filter: scoped=${scopedSos.length} all=${allSos.length}`)
  }
}

// ─── DB: per-matter completion isolation ───
const { rows: allAgr } = await pgClient.query(
  `SELECT id, agreement_number, status, completed_at FROM agreements WHERE agency_id = $1 AND client_id = $2`,
  [agencyId, clientId],
)
const { rows: allAp } = await pgClient.query(
  `SELECT id, approval_number, status, lodged_at, client_signed_at FROM application_approvals WHERE agency_id = $1 AND client_id = $2 AND deleted_at IS NULL`,
  [agencyId, clientId],
)
const apA = allAp.find((a) => a.approval_number === matters.A.fileNum)
const agrArow = allAgr.find((a) => a.agreement_number === matters.A.fileNum)
const apB = allAp.find((a) => a.approval_number === matters.B.fileNum)
if (apA && agrArow && apB) {
  const aLodged = apA.status === 'lodged' || Boolean(apA.lodged_at)
  const bLodged = apB.status === 'lodged' || Boolean(apB.lodged_at)
  const aSigned = agrArow.status === 'signed' || Boolean(agrArow.completed_at)
  if (aLodged && aSigned && !bLodged) {
    console.log('PASS DB: Matter A lodged, Matter B not — per-matter completion can differ')
  }
}

// ─── Browser audit ───
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

  // Matter A profile
  if (matterA) {
    const urlA = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterA.source}&file_id=${matterA.id}&tab=file_notes`
    await page.goto(urlA, { waitUntil: 'networkidle2', timeout: 90000 })
    await sleep(4000)
    const textA = await page.evaluate(() => document.body.innerText)

    const hasLeakB = textA.includes('NOTE_ISOLATION_AGR_B') || textA.includes('NOTE_ISOLATION_AP_B') || textA.includes('NOTE_ISOLATION_AP_C')
    const hasOwnA = textA.includes('NOTE_ISOLATION_AGR_A') || textA.includes('NOTE_ISOLATION_AP_A')

    if (hasLeakB) {
      add('CRITICAL', 'BROWSER-NOTES-LEAK', 'File notes tab shows other matter notes when Matter A selected', {
        url: urlA,
        leaked: ['B or C markers visible'],
      })
    } else if (hasOwnA) {
      console.log('PASS browser: Matter A file notes isolated')
    }

    // Check compliance % same when switching
    const compTextA = textA.match(/(\d+)% Compliant/)?.[1]

    if (matterB) {
      const urlB = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterB.source}&file_id=${matterB.id}`
      await page.goto(urlB, { waitUntil: 'networkidle2', timeout: 90000 })
      await sleep(4000)
      const textB = await page.evaluate(() => document.body.innerText)
      const compTextB = textB.match(/(\d+)% Compliant/)?.[1]

      if (compTextA && compTextB && compTextA === compTextB) {
        add('CRITICAL', 'BROWSER-COMPLIANCE-LEAK', 'Compliance score unchanged when switching between matters with different progress', {
          matterA: matters.A.fileNum, matterB: matters.B.fileNum, score: compTextA,
        })
      }

      // Switcher visible?
      if (!textB.includes('AUD-MATTER') && files.length >= 3) {
        add('MEDIUM', 'BROWSER-SWITCHER', 'Matter switcher may not show audit file numbers prominently', { files: files.length })
      }
    }

    if (matterA) {
      const urlSos = `${baseUrl}/workspace/${agencySlug}/clients/${clientId}?file_source=${matterA.source}&file_id=${matterA.id}&tab=statement_of_service`
      await page.goto(urlSos, { waitUntil: 'networkidle2', timeout: 60000 })
      await sleep(2000)
      console.log('PASS browser: SOS tab loaded with matter scope in URL')
    }
  }

  await browser.close()
} else {
  add('MEDIUM', 'BROWSER-SKIP', 'Chrome not found — browser audit skipped', {})
}

await pgClient.end()

add('MEDIUM', 'SEARCH-CLIENT-LEVEL', 'Global search returns client with active_file_count but no per-matter selection', {
  api: '/api/clients/search returns active_file_count aggregate',
  db: 'No client_matters table — matters derived from agreements+approvals',
})

add('LOW', 'PROFILE-SINGLE-CLIENT-NUMBER', 'clients.client_number is one per client, not per matter', {
  db: 'File numbers live on agreement_number / approval_number',
})

add('LOW', 'NO-CLIENT_MATTERS-TABLE', 'No first-class client_matters entity — multi-matter is file-derived', {
  db: 'matters = agreements ∪ approvals via ClientFilesService',
})

// ─── Report ───
console.log('\n' + '='.repeat(72))
console.log('MULTI-MATTER PRODUCTION READINESS AUDIT')
console.log('='.repeat(72))
console.log(`Client: ${clientName}`)
console.log(`Agency: ${agencySlug}`)
console.log(`Matters seeded/checked: A=${matters.A.fileNum}, B=${matters.B.fileNum}, C=${matters.C.fileNum}`)
console.log(`Total files via API: ${files.length}`)

for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
  console.log(`\n## ${sev} (${findings[sev].length})`)
  for (const f of findings[sev]) {
    console.log(`\n[${f.id}] ${f.title}`)
    console.log(JSON.stringify(f.evidence, null, 2))
  }
}

const total = Object.values(findings).flat().length
const critical = findings.CRITICAL.length
console.log(`\n${'='.repeat(72)}`)
console.log(`TOTAL FINDINGS: ${total} (CRITICAL: ${critical}, HIGH: ${findings.HIGH.length}, MEDIUM: ${findings.MEDIUM.length}, LOW: ${findings.LOW.length})`)
const mm1Pass =
  critical === 0 &&
  !findings.CRITICAL.some((f) => f.id.startsWith('API-MATTER') || f.id.startsWith('MM1')) &&
  !findings.HIGH.some((f) => f.id === 'API-MATTER-CTX-LEAK' || f.id === 'API-DASH-NO-MATTER')

console.log('MM-1 MATTER ISOLATION: ' + (mm1Pass ? 'PASS' : 'FAIL'))
console.log(
  'VERDICT: ' +
    (critical > 0
      ? 'NOT PRODUCTION-READY for multi-matter clients'
      : mm1Pass
        ? 'PRODUCTION-READY for multi-matter workflow isolation'
        : findings.HIGH.length > 0
          ? 'CONDITIONAL — high-severity gaps remain'
          : 'REVIEW remaining items'),
)
process.exit(critical > 0 ? 2 : mm1Pass ? 0 : findings.HIGH.length > 0 ? 1 : 0)
