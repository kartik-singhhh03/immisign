import fs from 'node:fs'
import pg from 'pg'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '')
}

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1]
const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
const sql = fs.readFileSync('supabase/migrations/20260611170000_client_matter_details.sql', 'utf8')
await client.query(sql)
const { rows } = await client.query(`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name = 'visa_stream' AND table_schema = 'public'
`)
console.log('APPLIED', rows)
await client.end()
