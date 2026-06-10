import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminDebugAccess } from '@/lib/integrations/health/admin-guard';
import { getResendFromEmail, sendEmailWithForensicLogging } from '@/lib/email/resend';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ctx = await requireAdminDebugAccess();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { email } = parsed.data;
  const subject = 'ImmiMate Email Verification';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:#111111;font-size:20px">ImmiMate Email Verification</h1>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        This email confirms production delivery is working.
      </p>
      <p style="color:#64748b;font-size:12px;margin-top:24px">
        Sent from ${getResendFromEmail()} via Resend · ${new Date().toISOString()}
      </p>
    </div>
  `;

  try {
    const result = await sendEmailWithForensicLogging(
      {
        from: getResendFromEmail(),
        to: email,
        subject,
        html,
        text: 'This email confirms production delivery is working.',
        tags: [{ name: 'type', value: 'rsd1_verification' }],
      },
      { emailType: 'rsd1_test', agencyId: ctx.agencyId },
    );

    const resendId = (result as { data?: { id?: string } })?.data?.id ?? null;

    const admin = createAdminClient();
    const { data: auditRow } = await admin
      .from('email_delivery_audit')
      .select('id, status, created_at')
      .eq('resend_id', resendId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      resendId,
      recipient: email,
      subject,
      from: getResendFromEmail(),
      auditId: auditRow?.id ?? null,
      auditStatus: auditRow?.status ?? 'accepted',
      message: 'Email accepted by Resend. Confirm delivery in Resend dashboard and inbox.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Send failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
