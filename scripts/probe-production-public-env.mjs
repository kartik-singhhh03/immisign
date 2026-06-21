#!/usr/bin/env node
/** Extract NEXT_PUBLIC_* from production JS bundles (public keys only). */
const base = process.argv[2] || 'https://immisign.vercel.app';
const html = await fetch(`${base}/login`).then((r) => r.text());
const scriptUrls = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => `${base}${m[1]}`);
console.log('script chunks:', scriptUrls.length);
let supabaseUrl = '';
let anonKey = '';
for (const url of scriptUrls.slice(0, 30)) {
  const js = await fetch(url).then((r) => r.text()).catch(() => '');
  const urlMatch = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
  if (urlMatch && !supabaseUrl) supabaseUrl = urlMatch[0];
  const keyMatch = js.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (keyMatch && keyMatch[0].length > 100 && !anonKey) anonKey = keyMatch[0];
}
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'NOT_FOUND');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? `${anonKey.slice(0, 20)}... (${anonKey.length} chars)` : 'NOT_FOUND');
