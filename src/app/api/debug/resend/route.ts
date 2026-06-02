import { NextResponse } from 'next/server';
import { requireOwnerSession } from '@/lib/auth/owner-only';
import {
  getResendConfigSummary,
  getResendFromEmail,
  sendEmailWithForensicLogging,
} from '@/lib/email/resend';

export async function POST(req: Request) {
  const authz = await requireOwnerSession();
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = await req.json().catch(() => ({}));
  const to = String(body?.to || authz.profile.email || '').trim().toLowerCase();

  if (!to) {
    return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
  }

  try {
    const resendResponse = await sendEmailWithForensicLogging({
      from: getResendFromEmail(),
      to,
      subject: 'ImmiSign Resend Test',
      html: '<p>Resend Working</p>',
      text: 'Resend Working',
      tags: [{ name: 'debug', value: 'resend' }],
    });

    return NextResponse.json({
      success: true,
      to,
      resendResponse,
      config: getResendConfigSummary(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send debug email';
    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error,
        config: getResendConfigSummary(),
      },
      { status: 502 },
    );
  }
}
