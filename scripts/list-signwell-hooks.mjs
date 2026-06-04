#!/usr/bin/env node
/**
 * List SignWell webhook subscriptions (GET /api/v1/hooks).
 * Use the `id` for SIGNWELL_WEBHOOK_ID — matches Workspace Callback URL in the dashboard.
 * Does not create documents or consume send quota.
 */
import fs from 'node:fs';

function loadEnv() {
  const env = {};
  if (!fs.existsSync('.env.local')) return env;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const apiKey = env.SIGNWELL_API_KEY?.trim();
const base = (env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1').replace(/\/$/, '');

if (!apiKey) {
  console.error('SIGNWELL_API_KEY missing in .env.local');
  process.exit(1);
}

const res = await fetch(`${base}/hooks`, {
  headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
});
const text = await res.text();
if (!res.ok) {
  console.error('HTTP', res.status, text);
  process.exit(1);
}

const hooks = JSON.parse(text);
const list = Array.isArray(hooks) ? hooks : hooks.data || [];
console.log('SignWell webhook subscriptions (use `id` as SIGNWELL_WEBHOOK_ID):\n');
for (const h of list) {
  console.log(`  id:           ${h.id}`);
  console.log(`  callback_url: ${h.callback_url}`);
  if (h.api_application_id) console.log(`  api_application_id: ${h.api_application_id}`);
  console.log('');
}
if (!list.length) {
  console.log('  (none) — set Workspace Callback URL in dashboard or POST /api/v1/hooks');
}
