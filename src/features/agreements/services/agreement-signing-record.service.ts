import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFService } from '@/features/agreements/services/pdf.service';
import type { NativeAgreementRow } from './native-agreement-signing.service';

export type AgreementSigningRecordContext = {
  agencyName: string;
  agentName: string;
  agentEmail: string;
  clientName: string;
  clientEmail: string;
  token: string;
  declarations: Record<string, boolean>;
};

const DECLARATION_LABELS: Record<string, string> = {
  readAgreement: 'I have read the agreement.',
  understandFees: 'I understand the fees.',
  authoriseAgent: 'I authorise the migration agent.',
  understandRefund: 'I understand refund and cancellation conditions.',
};

export class AgreementSigningRecordService {
  constructor(private supabase: SupabaseClient) {}

  async generate(
    agencyId: string,
    userId: string,
    agreement: NativeAgreementRow,
    ctx: AgreementSigningRecordContext,
  ): Promise<{ storagePath: string; pdfBuffer: Buffer; generatedAt: string }> {
    const html = buildAgreementSigningRecordHtml(agreement, ctx);
    const pdfBuffer = await PDFService.generatePdf(html);
    const generatedAt = new Date().toISOString();
    const storagePath = `${agencyId}/agreements/${agreement.id}/agreement-signing-record.pdf`;

    const { error: uploadError } = await this.supabase.storage.from('documents').upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (uploadError) throw new Error(`Signing record upload failed: ${uploadError.message}`);

    const { data: existingDoc } = await this.supabase
      .from('documents')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('file_url', storagePath)
      .limit(1)
      .maybeSingle();

    if (!existingDoc) {
      await this.supabase.from('documents').insert({
        agency_id: agencyId,
        agreement_id: agreement.id,
        uploaded_by: userId,
        file_name: 'agreement-signing-record.pdf',
        original_name: 'Agreement Signing Record.pdf',
        file_url: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
      });
    }

    return { storagePath, pdfBuffer, generatedAt };
  }
}

function buildAgreementSigningRecordHtml(
  agreement: NativeAgreementRow,
  ctx: AgreementSigningRecordContext,
): string {
  const signedAt = agreement.signed_at
    ? new Date(agreement.signed_at).toLocaleString('en-AU')
    : '—';
  const viewedAt = agreement.viewed_at ? new Date(agreement.viewed_at).toLocaleString('en-AU') : '—';
  const downloadedAt = agreement.downloaded_at
    ? new Date(agreement.downloaded_at).toLocaleString('en-AU')
    : '—';
  const generatedAt = new Date().toLocaleString('en-AU');

  const declLines = Object.entries(ctx.declarations)
    .filter(([, v]) => v)
    .map(([k]) => DECLARATION_LABELS[k] || k);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Inter, Helvetica, Arial, sans-serif; color: #111111; padding: 48px; font-size: 12px; line-height: 1.6; }
    h1 { font-size: 20px; letter-spacing: 0.04em; margin-bottom: 24px; }
    h2 { font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    p { margin: 6px 0; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 12px; }
    .hash { font-family: monospace; font-size: 9px; word-break: break-all; color: #334155; }
    .muted { color: #64748b; font-size: 10px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Agreement Signing Record</h1>
  <p><strong>Category:</strong> Agreement Signing Record</p>
  <p><strong>Provider:</strong> ImmiSign Native Signing</p>
  <h2>Agreement</h2>
  <p><strong>Agreement ID:</strong> ${escapeHtml(agreement.id)}</p>
  <p><strong>Agreement Reference:</strong> ${escapeHtml(agreement.agreement_number || '—')}</p>
  <p><strong>Agreement Name:</strong> ${escapeHtml(agreement.title || '—')}</p>
  <h2>Agency &amp; Agent</h2>
  <p><strong>Agency:</strong> ${escapeHtml(ctx.agencyName)}</p>
  <p><strong>Agent:</strong> ${escapeHtml(ctx.agentName)}</p>
  <p><strong>Agent Email:</strong> ${escapeHtml(ctx.agentEmail)}</p>
  <h2>Client</h2>
  <p><strong>Client:</strong> ${escapeHtml(ctx.clientName)}</p>
  <p><strong>Client Email:</strong> ${escapeHtml(ctx.clientEmail)}</p>
  <p><strong>Confirmed Name:</strong> ${escapeHtml(agreement.client_name_confirmed || ctx.clientName)}</p>
  <h2>Timestamps</h2>
  <p><strong>Signed At:</strong> ${escapeHtml(signedAt)}</p>
  <p><strong>Viewed At:</strong> ${escapeHtml(viewedAt)}</p>
  <p><strong>Downloaded At:</strong> ${escapeHtml(downloadedAt)}</p>
  <h2>Forensic Evidence</h2>
  <p><strong>IP Address:</strong> ${escapeHtml(agreement.client_ip || '—')}</p>
  <p><strong>User Agent:</strong> ${escapeHtml(agreement.client_user_agent || '—')}</p>
  <p><strong>Signing Token:</strong> ${escapeHtml(ctx.token)}</p>
  <h2>Integrity Hashes (SHA-256)</h2>
  <p><strong>Original PDF Hash:</strong><br/><span class="hash">${escapeHtml(agreement.pdf_hash || '—')}</span></p>
  <p><strong>Signed PDF Hash:</strong><br/><span class="hash">${escapeHtml(agreement.signed_pdf_hash || '—')}</span></p>
  <p><strong>Signature PNG Hash:</strong><br/><span class="hash">${escapeHtml(agreement.signature_hash || '—')}</span></p>
  <p><strong>Audit Chain Hash:</strong><br/><span class="hash">${escapeHtml(agreement.audit_hash || '—')}</span></p>
  <h2>Declarations Accepted</h2>
  <div class="box">${declLines.length ? declLines.map((d) => `<p>✓ ${escapeHtml(d)}</p>`).join('') : '<p>—</p>'}</div>
  <p class="muted">Generated: ${escapeHtml(generatedAt)} · ImmiSign compliance record · Legal source of truth: signed-agreement.pdf</p>
</body>
</html>`;
}

export function buildAgreementSignedFileNoteBody(params: {
  clientName: string;
  agreementRef: string;
  signedAt: string;
  confirmedName: string;
  clientIp: string | null;
  token: string;
  signingRecordPath?: string | null;
}): string {
  return [
    'Agreement Signed',
    '',
    'Client signed the service agreement electronically.',
    '',
    `Client: ${params.clientName}`,
    `Agreement: ${params.agreementRef}`,
    `Signed At: ${params.signedAt}`,
    `Confirmed Name: ${params.confirmedName}`,
    `IP Address: ${params.clientIp || '—'}`,
    params.signingRecordPath ? `Signing Record: ${params.signingRecordPath}` : '',
    '',
    `Signing Token: ${params.token}`,
    '',
    'Generated automatically by ImmiSign.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildClientAgreementSignedNotificationHtml(params: {
  clientName: string;
  agreementRef: string;
  signedAt: string;
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h1 style="font-size:20px;font-weight:600">Agreement Successfully Signed</h1>
      <p style="font-size:14px;line-height:1.6;color:#333">
        Dear ${escapeHtml(params.clientName)},<br/><br/>
        Your service agreement <strong>${escapeHtml(params.agreementRef)}</strong> was signed on ${escapeHtml(params.signedAt)}.
        The executed agreement is attached to this email.
      </p>
    </div>`;
}

export function buildAgentAgreementSignedNotificationHtml(params: {
  clientName: string;
  agreementRef: string;
  signedAt: string;
  confirmedName: string;
  clientIp: string | null;
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h1 style="font-size:20px;font-weight:600">Agreement Signed By Client</h1>
      <p style="font-size:14px;line-height:1.6;color:#333">
        <strong>Client:</strong> ${escapeHtml(params.clientName)}<br/>
        <strong>Agreement:</strong> ${escapeHtml(params.agreementRef)}<br/>
        <strong>Signed:</strong> ${escapeHtml(params.signedAt)}<br/>
        <strong>Confirmed Name:</strong> ${escapeHtml(params.confirmedName)}<br/>
        <strong>IP:</strong> ${escapeHtml(params.clientIp || '—')}
      </p>
      <p style="font-size:12px;color:#888">Signed agreement and Agreement Signing Record are attached.</p>
    </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
