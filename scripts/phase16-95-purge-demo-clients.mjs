/**
 * Lists (and optionally soft-deletes) seed/demo clients for a workspace.
 * Usage:
 *   node scripts/phase16-95-purge-demo-clients.mjs --slug anshu-labs
 *   node scripts/phase16-95-purge-demo-clients.mjs --slug anshu-labs --apply
 */
import { createClient } from '@supabase/supabase-js';

const DEMO_EMAIL_DOMAINS = ['@example.com', '@test.com', '@mailinator.com'];
const DEMO_NAME_RE = /^(phase\s*\d|phase\d|demo\s|test\s|qa\s|e2e\s)/i;
const DEMO_PHONE_RE = /^0?4000000000$/;

function isDemo(row) {
  const name = (row.name || '').trim();
  const email = (row.email || '').trim().toLowerCase();
  const phone = (row.phone || '').replace(/\s/g, '');
  if (DEMO_NAME_RE.test(name) || name.toLowerCase().includes('phase11')) return true;
  if (DEMO_EMAIL_DOMAINS.some((d) => email.endsWith(d))) return true;
  if (DEMO_PHONE_RE.test(phone)) return true;
  return false;
}

const slug = process.argv.find((a, i) => process.argv[i - 1] === '--slug');
const apply = process.argv.includes('--apply');

if (!slug) {
  console.error('Provide --slug <workspace-slug>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', slug).single();
if (!agency) {
  console.error('Agency not found for slug', slug);
  process.exit(1);
}

const { data: clients, error } = await supabase
  .from('clients')
  .select('id, name, email, phone, created_at')
  .eq('agency_id', agency.id)
  .order('created_at', { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const demo = (clients || []).filter(isDemo);
console.log(JSON.stringify({ agency: agency.slug, total: clients?.length || 0, demoCount: demo.length, demo }, null, 2));

if (apply && demo.length) {
  const ids = demo.map((c) => c.id);
  const { error: delErr } = await supabase.from('clients').delete().in('id', ids);
  if (delErr) {
    console.error('Delete failed:', delErr.message);
    process.exit(1);
  }
  console.log(`Deleted ${ids.length} demo client(s).`);
}
