import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const baseUrl = process.argv[2] || 'http://localhost:3000';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin
  .from('agencies')
  .select('id, slug')
  .eq('slug', 'avc-migration-live')
  .single();

const { data: owner } = await admin
  .from('users')
  .select('email')
  .eq('agency_id', agency.id)
  .eq('role', 'owner')
  .limit(1)
  .single();

const { data: client } = await admin
  .from('clients')
  .select('id, name')
  .eq('agency_id', agency.id)
  .eq('email', 'e2e.sa.1780744096525@immimate.test')
  .maybeSingle();

const { data: linkData } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: owner.email,
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anon.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
});

const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
const cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(
  JSON.stringify({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    token_type: 'bearer',
    user: sessionData.session.user,
  }),
)}`;

const headers = { cookie, 'Content-Type': 'application/json' };

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

const search = await get('/api/clients/search?q=kartik');
const searchAgr = await get('/api/clients/search?q=AML-2026-1038');
const noteTypes = await get('/api/note-types');
const files = client ? await get(`/api/clients/${client.id}/files`) : null;

let noteCreate = null;
let notesList = null;
if (files?.json?.files?.[0] && client) {
  const f = files.json.files[0];
  noteCreate = await fetch(`${baseUrl}/api/clients/${client.id}/file-notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      note_type: 'phone',
      body: `API audit note ${Date.now()}`,
      file_source: f.source,
      file_id: f.id,
    }),
  }).then(async (res) => ({ status: res.status, json: await res.json() }));

  notesList = await get(
    `/api/clients/${client.id}/file-notes?file_source=${f.source}&file_id=${f.id}&page=1`,
  );
}

console.log(
  JSON.stringify(
    {
      search,
      searchAgr,
      noteTypes: { status: noteTypes.status, count: noteTypes.json?.noteTypes?.length },
      files: files ? { status: files.status, count: files.json?.files?.length } : null,
      noteCreate,
      notesList: notesList
        ? { status: notesList.status, total: notesList.json?.total }
        : null,
    },
    null,
    2,
  ),
);
