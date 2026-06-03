import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFService } from '@/features/agreements/services/pdf.service';
import { loadRmaSignatureForUser } from './rma-signature';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateSenderAttestationPdf(
  supabase: SupabaseClient,
  agencyId: string,
  senderUserId: string,
  documentName: string,
): Promise<Buffer> {
  const signature = await loadRmaSignatureForUser(supabase, agencyId, senderUserId);
  if (!signature) {
    throw new Error('Sender signature not configured.');
  }

  const signedAt = new Date().toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #081b2e; margin: 0; padding: 40px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 28px; }
    .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #f8fafc; }
    .sig { margin-top: 16px; min-height: 72px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Agent certification — document send</h1>
  <p class="meta">Document: ${escapeHtml(documentName)} · Signed at send: ${escapeHtml(signedAt)}</p>
  <div class="box">
    <p><strong>Certified by:</strong> ${escapeHtml(signature.fullName)}</p>
    ${signature.marn ? `<p><strong>MARN:</strong> ${escapeHtml(signature.marn)}</p>` : ''}
    <p><strong>Email:</strong> ${escapeHtml(signature.email)}</p>
    <div class="sig">${signature.imageHtml}</div>
    <p style="font-size:12px;margin-top:16px;color:#475569;">
      This page certifies that the sending migration agent applied their signature at dispatch.
      External recipients sign via SignWell on the attached document file(s).
    </p>
  </div>
  <p class="footer">Agent certification · generated at document send</p>
</body>
</html>`;

  return PDFService.generatePdf(html);
}
