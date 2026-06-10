import fs from 'node:fs'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '')
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: agency } = await admin.from('agencies').select('id').eq('slug', 'ritiklabs').single()
const { data: users } = await admin.from('users').select('email').eq('agency_id', agency.id).limit(1).single()
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users.email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: sess } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
const token = sess.session.access_token
const clientId = 'bad84fbf-d49b-44eb-888a-254503bfc1fa'

const dashRes = await fetch('http://localhost:3000/api/compliance/dashboard', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
const dash = dashRes.dashboard || dashRes

console.log('=== Compliance Dashboard ===')
console.log('Summary:', dash.summaryCards?.map((c) => `${c.label}: ${c.count}`))
const queue = dash.attentionQueue || []
const raj = queue.filter((r) => r.clientId === clientId)
console.log('Rajwant queue rows:', raj?.length)
if (queue[0]) console.log('Attention row keys:', Object.keys(queue[0]))
if (raj?.[0]) console.log('Rajwant attention:', raj[0])

const search = await fetch('http://localhost:3000/api/clients/search?q=Rajwant', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
console.log('\n=== Search ===')
console.log(search.clients)

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)[1]
const pgC = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})
await pgC.connect()
const { rows } = await pgC.query(
  `SELECT approval_number, status, visa_subclass, (lodged_at IS NOT NULL) AS lodged
   FROM application_approvals WHERE client_id = $1 AND approval_number LIKE 'AUD-MATTER%' ORDER BY approval_number`,
  [clientId],
)
console.log('\n=== DB Audit Approvals (different status per matter) ===')
console.table(rows)

const agrA = 'fe4fc48e-cd3e-44b9-9875-d82b3b746b51'
const agrB = '0da65bd6-4100-4e0e-9933-67f9d03235de'
for (const [label, id] of [['A', agrA], ['B', agrB]]) {
  const ctx = await fetch(
    `http://localhost:3000/api/clients/${clientId}/matter-context?file_source=agreement&file_id=${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).then((r) => r.json())
  console.log(`\nMatter ${label} API:`, {
    file: ctx.context?.fileNumber,
    visa: ctx.context?.visaSubclass,
    stage: ctx.context?.currentStage,
    compliance: `${ctx.context?.compliance?.completed}/${ctx.context?.compliance?.total}`,
    status: ctx.context?.matterStatus,
  })
}
await pgC.end()
