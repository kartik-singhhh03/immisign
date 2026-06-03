import { createAdminClient } from '@/lib/supabase/admin';
import { getResendFromEmail, sendEmailWithForensicLogging } from './resend';

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ sent: boolean; error?: string }> {
  try {
    await sendEmailWithForensicLogging({
      from: getResendFromEmail(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
      tags: params.tags,
    });
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const href = params.actionUrl.startsWith('http')
    ? params.actionUrl
    : `${appUrl}${params.actionUrl}`;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase">${params.agencyName || 'ImmiSign'}</p>
      <h1 style="color:#081B2E;font-size:20px;margin:16px 0 8px">${params.title}</h1>
      <p style="color:#334155;font-size:14px;line-height:1.6">${params.body}</p>
      <p style="margin-top:24px">
        <a href="${href}" style="background:#0D9F8C;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View in ImmiSign</a>
      </p>
    </div>
  `;
}
