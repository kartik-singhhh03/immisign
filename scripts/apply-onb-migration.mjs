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
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const sql = fs.readFileSync('supabase/migrations/20260614100000_onb_unified_onboarding.sql', 'utf8')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query('BEGIN')
try {
  await client.query(sql)
  await client.query(
    `INSERT INTO public.schema_migrations (filename) VALUES ('20260614100000_onb_unified_onboarding.sql') ON CONFLICT DO NOTHING`,
  )
  await client.query('COMMIT')
  console.log('APPLIED ONB migration OK')
} catch (e) {
  await client.query('ROLLBACK')
  console.error('FAILED', e.message)
  process.exit(1)
} finally {
  await client.end()
}
