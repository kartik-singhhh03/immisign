#!/usr/bin/env node
/** Restore .env.local from Supabase CLI + known production config. Never commit output. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = '.env.local';
const projectRef = 'wnohcmgmyhamsbmkiybc';

function getSupabaseKeys() {
  const raw = execSync(`npx supabase projects api-keys --project-ref ${projectRef}`, { encoding: 'utf8' });
  const data = JSON.parse(raw);
  const anon = data.keys?.find((k) => k.name === 'anon')?.api_key;
  const service = data.keys?.find((k) => k.name === 'service_role')?.api_key;
  if (!anon || !service) throw new Error('Supabase CLI did not return API keys');
  return { anon, service };
}

async function tryVercelDecrypt(existingContent) {
  const token = existingContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/)?.[1];
  if (!token) return {};
  const projectId = 'prj_x8iczD6NE96ngswnCEo5sGbZzC8y';
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  const out = {};
  for (const e of data.envs || []) {
    if (e.value?.trim()) out[e.key] = e.value;
  }
  return out;
}

const existingContent = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
const { anon, service } = getSupabaseKeys();
const vercel = await tryVercelDecrypt(existingContent);

const env = {
  NEXT_PUBLIC_APP_URL: vercel.NEXT_PUBLIC_APP_URL || 'https://immisign.vercel.app',
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  SUPABASE_SERVICE_ROLE_KEY: service,
  RESEND_API_KEY: vercel.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: vercel.RESEND_FROM_EMAIL || 'support@immisign.app',
  RESEND_WEBHOOK_SECRET: vercel.RESEND_WEBHOOK_SECRET || '',
  SIGNWELL_API_KEY: vercel.SIGNWELL_API_KEY || '',
  SIGNWELL_WEBHOOK_ID: vercel.SIGNWELL_WEBHOOK_ID || '68e25406-9795-48c0-bd4a-c74a0646ea61',
  SIGNWELL_TEST_MODE: vercel.SIGNWELL_TEST_MODE || 'false',
  STRIPE_SECRET_KEY: vercel.STRIPE_SECRET_KEY || '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: vercel.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
};

const lines = ['# Restored by scripts/restore-local-env.mjs — do not commit', ...Object.entries(env).map(([k, v]) => `${k}="${v}"`)];
if (vercel.VERCEL_OIDC_TOKEN) lines.push(`VERCEL_OIDC_TOKEN="${vercel.VERCEL_OIDC_TOKEN}"`);
else {
  const oid = existingContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/)?.[1];
  if (oid) lines.push(`VERCEL_OIDC_TOKEN="${oid}"`);
}

fs.writeFileSync(OUT, lines.join('\n') + '\n');

const missing = ['RESEND_API_KEY', 'SIGNWELL_API_KEY'].filter((k) => !env[k]);
console.log('Wrote', OUT);
console.log('Supabase keys: OK');
for (const k of missing) console.log(`${k}: MISSING — add manually from Vercel dashboard if E2E needs it`);
