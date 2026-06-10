import fs from 'node:fs'
import pg from 'pg'
import { resolveDatabaseUrlCandidates } from './lib/resolve-database-url.mjs'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  let v = line.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[line.slice(0, i).trim()] = v
}

const url = resolveDatabaseUrlCandidates(env)[0]
if (!url) {
  console.error('Missing DATABASE_URL / SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const sql = fs.readFileSync('supabase/migrations/20260613100000_rls_security_advisor_fix.sql', 'utf8')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()

await client.query('BEGIN')
try {
  await client.query(sql)
  await client.query(
    `INSERT INTO public.schema_migrations (filename) VALUES ('20260613100000_rls_security_advisor_fix.sql') ON CONFLICT DO NOTHING`,
  )
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  console.error('FAILED', e.message)
  process.exit(1)
}

const { rows: rls } = await client.query(`
  SELECT c.relname, c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('schema_migrations', 'agreement_reference_counters')
`)

const { rows: policies } = await client.query(`
  SELECT tablename, policyname, roles
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('schema_migrations', 'agreement_reference_counters')
`)

console.log('RLS enabled:')
for (const r of rls) console.log(`  ${r.relname}: ${r.relrowsecurity ? 'YES' : 'NO'}`)
console.log('Policies:')
for (const p of policies) console.log(`  ${p.tablename}.${p.policyname} -> ${p.roles}`)

await client.end()
console.log('APPLIED OK')
