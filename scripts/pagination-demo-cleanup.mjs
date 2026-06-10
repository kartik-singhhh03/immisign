/**
 * Remove demo-pattern records from ritiklabs production tenant only.
 * Usage: node scripts/pagination-demo-cleanup.mjs [agencySlug]
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

// Inline isDemo check (can't import TS in mjs easily)
const DEMO_EMAIL_DOMAINS = ['@example.com', '@test.com', '@mailinator.com', '@immimate.test'];
const DEMO_NAME_RE = /^(phase\s*\d|phase\d|demo\s|test\s|qa\s|e2e\s)/i;
function isDemo(c) {
  const name = (c.name || '').trim();
  const email = (c.email || '').trim().toLowerCase();
  const phone = (c.phone || '').replace(/\s/g, '');
  if (DEMO_NAME_RE.test(name)) return true;
  if (name.toLowerCase().includes('phase11')) return true;
  if (DEMO_EMAIL_DOMAINS.some((d) => email.endsWith(d))) return true;
  if (/^0?4000000000$/.test(phone)) return true;
  if (/^client\s*\d{10,}/i.test(name)) return true;
  return false;
}

const env = loadEnv();
const agencySlug = process.argv[2] || 'ritiklabs';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agency } = await admin.from('agencies').select('id, slug').eq('slug', agencySlug).single();
const { data: clients } = await admin.from('clients').select('id, name, email, phone').eq('agency_id', agency.id);
const demoClients = (clients || []).filter(isDemo);
console.log(`Found ${demoClients.length} demo-pattern clients in ${agencySlug}`);
for (const c of demoClients) {
  console.log(`  DELETE client ${c.id} ${c.name} ${c.email}`);
  await admin.from('clients').delete().eq('id', c.id);
}
console.log('Done.');
