#!/usr/bin/env node
/**
 * Raw SignWell API test (no Next.js). Usage:
 *   node scripts/phase16-97-signwell-raw-test.mjs [signer-email]
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
const apiKey = env.SIGNWELL_API_KEY || process.env.SIGNWELL_API_KEY;
const signerEmail = process.argv[2] || 'kartiksingh2829@gmail.com';

const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || 'development';
let testMode;
if (env.SIGNWELL_TEST_MODE === 'true' || process.env.SIGNWELL_TEST_MODE === 'true') testMode = true;
else if (env.SIGNWELL_TEST_MODE === 'false' || process.env.SIGNWELL_TEST_MODE === 'false') testMode = false;
else testMode = nodeEnv !== 'production';

// Public sample PDF SignWell can fetch
const samplePdf =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const base = 'https://www.signwell.com/api/v1';

async function sw(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

if (!apiKey) {
  console.error('SIGNWELL_API_KEY missing');
  process.exit(1);
}

const createPayload = {
  test_mode: testMode,
  draft: true,
  name: 'phase16-97-raw-test',
  files: [{ name: 'dummy.pdf', file_url: samplePdf }],
  recipients: [
    {
      id: 'signer_1',
      name: 'Kartik Singh',
      email: signerEmail,
      routing_order: 1,
    },
  ],
  with_signature_page: true,
};

console.log('ENV', { nodeEnv, SIGNWELL_TEST_MODE: env.SIGNWELL_TEST_MODE || '(unset)', computedTestMode: testMode });
console.log('CREATE_REQUEST', JSON.stringify(createPayload, null, 2));

const created = await sw('/documents', {
  method: 'POST',
  body: JSON.stringify(createPayload),
});
console.log('CREATE_RESPONSE', JSON.stringify(created, null, 2));

if (!created.ok || !created.body?.id) {
  process.exit(1);
}

const sentEmpty = await sw(`/documents/${created.body.id}/send`, { method: 'POST' });
console.log('SEND_EMPTY_BODY_RESPONSE', JSON.stringify(sentEmpty, null, 2));

const sent = await sw(`/documents/${created.body.id}/send`, {
  method: 'POST',
  body: JSON.stringify({
    subject: 'Please sign — ImmiSign test',
    message: 'Phase 16.97 send body test',
  }),
});
console.log('SEND_WITH_BODY_RESPONSE', JSON.stringify(sent, null, 2));

const fetched = await sw(`/documents/${created.body.id}`, { method: 'GET' });
console.log('GET_RESPONSE', JSON.stringify(fetched, null, 2));

const signers = fetched.body?.recipients || fetched.body?.signers || [];
console.log('SUMMARY', {
  signwellReceivedSendRequest: sent.ok,
  documentId: created.body.id,
  status: fetched.body?.status,
  signers: signers.map((s) => ({
    email: s.email,
    status: s.status,
    hasSigningUrl: Boolean(s.signing_url),
  })),
  testMode,
  inboxNote: testMode
    ? 'test_mode=true — SignWell will NOT email real inboxes'
    : 'test_mode=false — check signer inbox and spam',
});
