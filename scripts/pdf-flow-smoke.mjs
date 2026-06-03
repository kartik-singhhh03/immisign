#!/usr/bin/env node
/**
 * Smoke-test real PDF generation (agreement engine + send-document attestation use the same PDFService).
 *
 * Usage:
 *   node scripts/pdf-flow-smoke.mjs
 *   node scripts/pdf-flow-smoke.mjs http://localhost:3001
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

async function main() {
  const url = `${base}/api/dev/pdf-smoke`;
  console.log('PDF smoke:', url);

  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    console.error('FAIL', res.status, data);
    process.exit(1);
  }

  console.log('PASS', {
    bytes: data.bytes,
    header: data.header,
    vercel: data.vercel,
    nodeEnv: data.nodeEnv,
  });
  console.log(
    'Agreement wizard and send-document flows use PDFService.generatePdf() — same Chromium/Puppeteer path.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
