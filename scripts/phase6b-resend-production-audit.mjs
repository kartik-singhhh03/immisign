import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const sender = env.RESEND_FROM_EMAIL || null;
const keyPresent = Boolean(env.RESEND_API_KEY);
console.log('RESEND_CONFIG', JSON.stringify({
  keyPresent,
  sender,
  domain: sender?.split('@')[1] || null,
}, null, 2));

if (!keyPresent) {
  console.log('RESEND_AUDIT_ERROR', 'RESEND_API_KEY is missing');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}` };
const domainsRes = await fetch('https://api.resend.com/domains', { headers });
const bodyText = await domainsRes.text();
console.log('DOMAINS_STATUS', domainsRes.status);
console.log('DOMAINS_BODY', bodyText);

if (domainsRes.status !== 200) {
  console.log('DNS_REQUIRED_RECORDS', JSON.stringify([
    'SPF TXT: v=spf1 include:amazonses.com ~all (or provider-specified SPF)',
    'DKIM CNAME/TXT records provided by Resend dashboard',
    'Return-Path / MAIL FROM records from Resend',
    'DMARC TXT: v=DMARC1; p=none/quarantine/reject; rua=mailto:postmaster@yourdomain',
  ], null, 2));
}
