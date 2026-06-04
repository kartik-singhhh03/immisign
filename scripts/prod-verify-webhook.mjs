#!/usr/bin/env node
const url = process.argv[2] || 'https://immisign.vercel.app/api/webhooks/signwell';
const body = {
  event: { type: 'document_viewed', time: Math.floor(Date.now() / 1000), hash: 'invalid-test-hash' },
  data: { object: { id: '00000000-0000-0000-0000-000000000001' } },
};
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(JSON.stringify({ url, status: res.status, body: text.slice(0, 500) }, null, 2));
