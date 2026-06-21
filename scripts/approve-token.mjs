import fs from 'node:fs';

const token = process.argv[2];
const clientName = process.argv[3] || 'raju singh';
const baseUrl = process.argv[4] || 'https://immisign.vercel.app';

const res = await fetch(`${baseUrl}/api/public/approval/${token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'approve', clientName }),
});
console.log('status', res.status);
console.log(await res.text());
