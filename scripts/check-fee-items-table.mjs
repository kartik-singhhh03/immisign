import fs from 'node:fs'
import pg from 'pg'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '')
}

const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const region = env.SUPABASE_DB_REGION || 'ap-southeast-2'
const urls = [
  `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
]

for (const dbUrl of urls) {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const { rows } = await client.query(`SELECT to_regclass('public.agreement_fee_items') AS t`)
    const { rows: cols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'matter_types' AND column_name IN ('is_active','archived_at')
    `)
    console.log('CONNECTED', dbUrl.replace(/:[^:@]+@/, ':***@'))
    console.log('agreement_fee_items', rows[0]?.t || 'MISSING')
    console.log('matter_types cols', cols.map((c) => c.column_name).join(', ') || 'MISSING')
    await client.end()
    process.exit(0)
  } catch (e) {
    console.warn('FAIL', e.message)
    try { await client.end() } catch { /* ignore */ }
  }
}
process.exit(1)
