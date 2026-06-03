import { NextResponse } from 'next/server';
import { PDFService } from '@/features/agreements/services/pdf.service';

/**
 * Dev-only: verifies Puppeteer/Chromium can render a real PDF buffer.
 * GET /api/dev/pdf-smoke — not available in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>body{font-family:system-ui;padding:40px;color:#081b2e}h1{font-size:22px}</style>
</head><body>
<h1>ImmiSign PDF smoke test</h1>
<p>Generated at ${new Date().toISOString()}</p>
<p>If you can read this as a PDF, agreement and send-document PDF pipelines can use the same engine.</p>
</body></html>`;

  try {
    const buffer = await PDFService.generatePdf(html);
    const ok = buffer.length > 500 && buffer.subarray(0, 4).toString() === '%PDF';
    return NextResponse.json({
      success: ok,
      bytes: buffer.length,
      header: buffer.subarray(0, 8).toString('ascii'),
      vercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
