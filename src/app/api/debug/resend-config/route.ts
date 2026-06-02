import { NextResponse } from 'next/server';
import { requireOwnerSession } from '@/lib/auth/owner-only';
import { getResendConfigSummary } from '@/lib/email/resend';

export async function GET() {
  const authz = await requireOwnerSession();
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  return NextResponse.json({
    success: true,
    ...getResendConfigSummary(),
  });
}
