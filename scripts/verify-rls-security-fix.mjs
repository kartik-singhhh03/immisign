import fs from 'node:fs'
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

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let pass = 0
let fail = 0

async function check(label, fn) {
  try {
    const ok = await fn()
    if (ok) {
      console.log(`PASS ${label}`)
      pass++
    } else {
      console.log(`FAIL ${label}`)
      fail++
    }
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message}`)
    fail++
  }
}

await check('anon blocked on schema_migrations', async () => {
  const { data, error } = await anon.from('schema_migrations').select('filename').limit(1)
  return Boolean(error) && (!data || data.length === 0)
})

await check('anon blocked on agreement_reference_counters', async () => {
  const { data, error } = await anon.from('agreement_reference_counters').select('agency_id').limit(1)
  return Boolean(error) && (!data || data.length === 0)
})

await check('service_role can read schema_migrations', async () => {
  const { data, error } = await admin.from('schema_migrations').select('filename').limit(1)
  return !error && Array.isArray(data)
})

await check('service_role can read agreement_reference_counters', async () => {
  const { data, error } = await admin.from('agreement_reference_counters').select('agency_id').limit(1)
  return !error && Array.isArray(data)
})

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} (${pass}/${pass + fail})`)
process.exit(fail > 0 ? 1 : 0)
