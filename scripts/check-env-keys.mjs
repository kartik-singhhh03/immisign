#!/usr/bin/env node
/** Report which integration env keys are set (no secret values). */
import fs from 'node:fs';

function loadEnv() {
  const env = {};
  if (!fs.existsSync('.env.local')) return env;
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

const env = loadEnv();
const KEYS = [
  ['SIGNWELL_API_KEY', 'SignWell API — get from app.signwell.com → API'],
  ['SIGNWELL_WEBHOOK_ID', 'SignWell webhook subscription id — run: node scripts/list-signwell-hooks.mjs'],
  ['SIGNWELL_WEBHOOK_SECRET', 'Optional legacy; UUID hook id can substitute'],
  ['RESEND_API_KEY', 'Resend API — starts with re_'],
  ['RESEND_FROM_EMAIL', 'Use onboarding@resend.dev until domain verified'],
  ['RESEND_WEBHOOK_SECRET', 'Resend webhook signing secret (Svix)'],
  ['NEXT_PUBLIC_APP_URL', 'Must match dev port, e.g. http://localhost:3000'],
  ['DATABASE_URL', 'Optional — Supabase SQL Editor if CLI migrations fail'],
  ['CRON_SECRET', 'Optional — secures notification digest cron'],
  ['STRIPE_SECRET_KEY', 'Billing only — skip for lifecycle E2E'],
];

for (const [key, hint] of KEYS) {
  const v = env[key];
  let status = 'MISSING';
  if (v) {
    status = v.includes('your_') || v.includes('YOUR_') ? 'PLACEHOLDER' : 'SET';
  }
  console.log(`${key.padEnd(28)} ${status.padEnd(12)} ${hint}`);
}
