import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFService } from '@/features/agreements/services/pdf.service';
import { APP_NAME } from '@/lib/brand';
import type { ApplicationApprovalRecord } from '../types/rebuild';

const APPROVAL_DECLARATION = `By approving this application the client confirmed that they have downloaded and read the full application attached to the notice, authorise lodgement, and understand that the application cannot be amended once lodged. This approval is legally significant and was recorded with a timestamp and IP address.`;

export type ApprovalRecordContext = {
  agencyName: string;
  agentName: string;
  agentEmail: string;
  clientName: string;
  clientEmail: string;
  token: string;
};

export class ApprovalRecordService {
  constructor(private supabase: SupabaseClient) {}

  async generate(
    agencyId: string,
    userId: string,
    approval: ApplicationApprovalRecord,
    ctx: ApprovalRecordContext,
  ): Promise<{ storagePath: string; pdfBuffer: Buffer; generatedAt: string }> {
    const html = buildApprovalRecordHtml(approval, ctx);
    const pdfBuffer = await PDFService.generatePdf(html);
    const generatedAt = new Date().toISOString();
    const storagePath = `${agencyId}/approvals/${approval.id}/application-approval-record.pdf`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw new Error(`Approval record upload failed: ${uploadError.message}`);

    const { data: existingDoc } = await this.supabase
      .from('documents')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('file_url', storagePath)
      .limit(1)
      .maybeSingle();

    if (!existingDoc) {
      const { error: docErr } = await this.supabase.from('documents').insert({
        agency_id: agencyId,
        agreement_id: null,
        uploaded_by: userId,
        file_name: 'application-approval-record.pdf',
        original_name: 'Application Approval Record.pdf',
        file_url: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
      });

      if (docErr) {
        console.error('APPROVAL_RECORD_DOCUMENT_INSERT', docErr.message);
      }
    }

    return { storagePath, pdfBuffer, generatedAt };
  }

  async getSignedDownloadUrl(storagePath: string) {
    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
    return data.signedUrl;
  }
}

export function buildApprovalFileNoteBody(params: {
  clientName: string;
  matterReference: string;
  approvedAt: string;
  confirmedName: string;
  clientIp: string | null;
  token: string;
  filename?: string | null;
}): string {
  const lines = [
    'Application Approval Received',
    '',
    'Client approved application for lodgement.',
    '',
    `Client: ${params.clientName}`,
    `Matter: ${params.matterReference}`,
  ];
  if (params.filename) {
    lines.push(`Attached File: ${params.filename}`);
  }
  lines.push(
    '',
    `Approved At: ${params.approvedAt}`,
    `Confirmed Name: ${params.confirmedName}`,
    `IP Address: ${params.clientIp || '—'}`,
    '',
    `Approval Token: ${params.token}`,
    '',
    `Generated automatically by ${APP_NAME}.`,
  );
  return lines.join('\n');
}

function buildApprovalRecordHtml(
  approval: ApplicationApprovalRecord,
  ctx: ApprovalRecordContext,
): string {
  const approvedAt = approval.approved_at
    ? new Date(approval.approved_at).toLocaleString('en-AU')
    : new Date().toLocaleString('en-AU');
  const generatedAt = new Date().toLocaleString('en-AU');

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
    .muted { color: #64748b; font-size: 10px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Application Approval Record</h1>
  <p><strong>Category:</strong> Application Approval Record</p>
  <h2>Agency &amp; Agent</h2>
  <p><strong>Agency:</strong> ${escapeHtml(ctx.agencyName)}</p>
  <p><strong>Agent:</strong> ${escapeHtml(ctx.agentName)}</p>
  <p><strong>Agent Email:</strong> ${escapeHtml(ctx.agentEmail)}</p>
  <h2>Client &amp; Matter</h2>
  <p><strong>Client:</strong> ${escapeHtml(ctx.clientName)}</p>
  <p><strong>Client Email:</strong> ${escapeHtml(ctx.clientEmail)}</p>
  <p><strong>Matter Reference:</strong> ${escapeHtml(approval.matter_reference || '—')}</p>
  <p><strong>Visa Subclass:</strong> ${escapeHtml(approval.visa_subclass || '—')}</p>
  <h2>Approval Details</h2>
  <p><strong>Attached File:</strong> ${escapeHtml(approval.application_file_name || 'Application.pdf')}${approval.application_file_size ? ` (${Math.round(approval.application_file_size / 1024)} KB)` : ''}</p>
  <p><strong>Storage Path:</strong> ${escapeHtml(approval.application_file_path || '—')}</p>
  <p><strong>Application Name:</strong> ${escapeHtml(approval.application_file_name || 'Application.pdf')}</p>
  <p><strong>Approval Status:</strong> Approved</p>
  <p><strong>Approved At:</strong> ${escapeHtml(approvedAt)}</p>
  <p><strong>Confirmed Client Name:</strong> ${escapeHtml(approval.client_name_confirmed || ctx.clientName)}</p>
  <p><strong>Client IP:</strong> ${escapeHtml(approval.client_ip || '—')}</p>
  <p><strong>Approval Token:</strong> ${escapeHtml(ctx.token)}</p>
  <h2>Declaration</h2>
  <div class="box">${escapeHtml(APPROVAL_DECLARATION)}</div>
  <p class="muted">Generated: ${escapeHtml(generatedAt)} · ${APP_NAME} compliance record</p>
</body>
</html>`;
}

export function buildAgentApprovalNotificationHtml(params: {
  clientName: string;
  matterReference: string;
  approvedAt: string;
  confirmedName: string;
  clientIp: string | null;
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h1 style="font-size:20px;font-weight:600">Application Approved For Lodgement</h1>
      <p style="font-size:14px;line-height:1.6;color:#333">
        <strong>Client:</strong> ${escapeHtml(params.clientName)}<br/>
        <strong>Matter:</strong> ${escapeHtml(params.matterReference)}<br/>
        <strong>Approved:</strong> ${escapeHtml(params.approvedAt)}<br/>
        <strong>Confirmed Name:</strong> ${escapeHtml(params.confirmedName)}<br/>
        <strong>IP:</strong> ${escapeHtml(params.clientIp || '—')}
      </p>
      <p style="font-size:14px;line-height:1.6;color:#333">
        The application has been authorised for lodgement.
      </p>
      <p style="font-size:12px;color:#888">Application Approval Record PDF is attached.</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
