/**
 * Agreement Wizard UX rebuild — API + DB verification
 * Usage: node scripts/verify-agreement-wizard-ux.mjs
 * Requires: dev server on :3000, SUPABASE_* in .env.local, logged-in session cookie optional (uses service role for DB)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* ignore */ }
}

loadEnv()

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000'
const AGENCY_SLUG = process.env.VERIFY_AGENCY_SLUG || 'ritiklabs'

const checks = []
function pass(name, detail = '') { checks.push({ name, ok: true, detail }) }
function fail(name, detail = '') { checks.push({ name, ok: false, detail }) }

async function main() {
  // 1. Matter types API reachable
  try {
    const res = await fetch(`${BASE}/api/settings/matter-types`)
    if (res.status === 401) pass('matter-types API', 'auth required (expected without session)')
    else if (res.ok) {
      const json = await res.json()
      pass('matter-types API', `returned ${(json.matterTypes || []).length} types`)
    } else fail('matter-types API', `HTTP ${res.status}`)
  } catch (e) {
    fail('matter-types API', e.message)
  }

  // 2. Preview PDF API structure (401 without auth is OK)
  try {
    const res = await fetch(`${BASE}/api/agreements/preview-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form: {}, agency: { name: 'Test', slug: AGENCY_SLUG } }),
    })
    if (res.status === 401) pass('preview-pdf API', 'auth gate OK')
    else if (res.ok && res.headers.get('content-type')?.includes('pdf')) pass('preview-pdf API', 'returns PDF')
    else fail('preview-pdf API', `HTTP ${res.status}`)
  } catch (e) {
    fail('preview-pdf API', e.message)
  }

  // 3. DB tables
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!dbUrl) {
    fail('DB agreement_fee_items table', 'no DATABASE_URL')
  } else {
    const client = new pg.Client({ connectionString: dbUrl })
    try {
      await client.connect()
      const { rows: feeCols } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_fee_items'
      `)
      if (feeCols.length >= 8) pass('DB agreement_fee_items table', `${feeCols.length} columns`)
      else fail('DB agreement_fee_items table', 'table missing — run migration')

      const { rows: mtCols } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'matter_types'
          AND column_name IN ('is_active', 'archived_at')
      `)
      if (mtCols.length === 2) pass('DB matter_types lifecycle columns', 'is_active + archived_at')
      else fail('DB matter_types lifecycle columns', `found ${mtCols.length}/2 — run migration`)
    } catch (e) {
      fail('DB connection', e.message)
    } finally {
      await client.end().catch(() => {})
    }
  }

  const failed = checks.filter((c) => !c.ok)
  console.log('\n=== Agreement Wizard UX Verification ===\n')
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`)
  process.exit(failed.length ? 1 : 0)
}

main()
