import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const key = env.RESEND_API_KEY;
const from = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const to = process.argv[2] || env.RESEND_DEBUG_TO || env.DEBUG_EMAIL_TO || 'owner@example.com';
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const domainsRes = await fetch('https://api.resend.com/domains', { headers });
console.log('DOMAINS_STATUS', domainsRes.status);
console.log('DOMAINS_BODY', await domainsRes.text());

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    from,
    to: [to],
    subject: 'ImmiSign forensic test',
    html: '<p>test</p>',
  }),
});
console.log('EMAIL_STATUS', emailRes.status);
console.log('EMAIL_BODY', await emailRes.text());
