import { createAdminClient } from '@/lib/supabase/admin';
import { APP_NAME } from '@/lib/brand';
import { resolveAppUrlForEmail } from '@/lib/app-url';
import { getResendFromEmail, sendEmailWithForensicLogging } from './resend';

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
  emailType?: string;
  agencyId?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  try {
    await sendEmailWithForensicLogging({
      from: getResendFromEmail(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
      tags: params.tags,
    }, { emailType: params.emailType, agencyId: params.agencyId });
    return { sent: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Email failed';
    console.warn('Transactional email:', message);
    return { sent: false, error: message };
  }
}

export async function resolveUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('users').select('email').eq('id', userId).single();
  return data?.email ?? null;
}

export function buildApprovalEmailHtml(params: {
  title: string;
  body: string;
  actionUrl: string;
  agencyName?: string;
}): string {
  const appUrl = resolveAppUrlForEmail();
  const href = params.actionUrl.startsWith('http')
    ? params.actionUrl
    : `${appUrl}${params.actionUrl}`;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase">${params.agencyName || APP_NAME}</p>
      <h1 style="color:#111111;font-size:20px;margin:16px 0 8px">${params.title}</h1>
      <p style="color:#334155;font-size:14px;line-height:1.6">${params.body}</p>
      <p style="margin-top:24px">
        <a href="${href}" style="background:#3E7C6B;color:#fff;padding:12px 20px;border-radius:0;text-decoration:none;font-weight:600;font-size:14px">View in ${APP_NAME}</a>
      </p>
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

/** Branded agreement signing email — always includes the portal CTA link. */
export function buildAgreementSigningEmailHtml(params: {
  agencyName: string;
  clientName: string;
  agreementTitle: string;
  agentName?: string;
  messageBody?: string;
  signUrl: string;
  expiresAt?: string;
}): string {
  const agency = escapeHtml(params.agencyName);
  const client = escapeHtml(params.clientName);
  const title = escapeHtml(params.agreementTitle);
  const agent = escapeHtml(params.agentName || params.agencyName);
  const signUrl = params.signUrl;

  const intro = params.messageBody?.trim()
    ? `<p style="font-size:14px;line-height:1.6;color:#333;margin:16px 0">${escapeHtml(params.messageBody).replace(/\n/g, '<br/>')}</p>`
    : `<p style="font-size:14px;line-height:1.6;color:#333;margin:16px 0">Please review and sign your service agreement securely online. This takes less than 2 minutes on any device.</p>`;

  const expiry = params.expiresAt
    ? `<p style="font-size:12px;color:#888;margin-top:16px">This signing link expires on ${escapeHtml(params.expiresAt)}.</p>`
    : '';

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <p style="font-size:12px;color:#5C5C5C;text-transform:uppercase;letter-spacing:0.08em">${agency}</p>
      <h1 style="font-size:22px;font-weight:600;margin:16px 0">Service Agreement — Signature Required</h1>
      <p style="font-size:14px;line-height:1.6;color:#333">Hi ${client},</p>
      <p style="font-size:14px;line-height:1.6;color:#333"><strong>${agent}</strong> has requested your signature on <strong>${title}</strong>.</p>
      ${intro}
      <p style="margin:28px 0">
        <a href="${signUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600">
          Review &amp; Sign Agreement
        </a>
      </p>
      <p style="font-size:12px;color:#888">If the button does not work, copy and paste this link into your browser:<br/><a href="${signUrl}" style="color:#111;word-break:break-all">${signUrl}</a></p>
      ${expiry}
    </div>
  `;
}

export function buildAgreementSigningEmailText(params: {
  clientName: string;
  agreementTitle: string;
  agentName?: string;
  agencyName: string;
  messageBody?: string;
  signUrl: string;
}): string {
  const agent = params.agentName || params.agencyName;
  const lines = [
    `Hi ${params.clientName},`,
    '',
    `${agent} has requested your signature on ${params.agreementTitle}.`,
    '',
    params.messageBody?.trim() || 'Please review and sign your service agreement securely online.',
    '',
    `Sign here: ${params.signUrl}`,
  ];
  return lines.join('\n');
}
