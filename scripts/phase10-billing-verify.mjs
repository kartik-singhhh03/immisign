#!/usr/bin/env node
/**
 * Phase 10 billing smoke checks (no browser).
 * Requires dev server: npm run dev
 */
const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function check(path, opts = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { url, status: res.status, body };
}

async function main() {
  const results = [];

  results.push(await check('/api/stripe/seats?role=agent'));
  results.push(await check('/api/stripe/billing'));
  results.push(await check('/api/stripe/usage'));

  let failed = 0;
  for (const r of results) {
    const ok = r.status === 401 || r.status === 200;
    const label = ok ? 'OK' : 'FAIL';
    if (!ok) failed++;
    console.log(`${label} ${r.status} ${r.url}`);
    if (!ok) console.log('  ', JSON.stringify(r.body).slice(0, 300));
  }

  console.log('\nNote: 401 without session cookie is expected for unauthenticated curl.');
  console.log('For full PASS: log in as owner, open /workspace/<slug>/billing, subscribe via Stripe test card 4242.');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
