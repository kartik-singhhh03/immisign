import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { guards, requireSession, forbidUnless } from '@/lib/auth/api-auth';
import { uiRoleToDb } from '@/lib/auth/db-roles';
import { getAppUrl } from '@/lib/app-url';
import { resendClient } from '@/lib/email/client';
import { render } from '@react-email/render';
import InvitationEmail from '@/emails/agency/invitation';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if ('response' in session) return session.response;

  const forbidden = forbidUnless(session.profile, guards.team, 'Only owners and admins can invite users');
  if (forbidden) return forbidden;

  const body = await req.json();
  const { name, email, role, marn } = body as {
    name?: string;
    email?: string;
    role?: string;
    marn?: string;
  };

  if (!name?.trim() || !email?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }

  const dbRole = uiRoleToDb(role);
  const admin = createAdminClient();
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: agency } = await (admin as any)
    .from('agencies')
    .select('name')
    .eq('id', session.profile.agency_id)
    .single();

  const insertPayload: Record<string, unknown> = {
    agency_id: session.profile.agency_id,
    email: email.trim().toLowerCase(),
    role: dbRole,
    token,
    expires_at: expiresAt,
    created_by: session.profile.id,
  };

  const { data: invitation, error } = await (admin as any)
    .from('invitations')
    .insert(insertPayload)
    .select('id, token')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const html = await render(
    InvitationEmail({
      name: name.trim(),
      agencyName: agency?.name || 'Your agency',
      inviterName: session.profile.full_name,
      role,
      inviteUrl,
      agencyBranding: { primary_color: '#0D9F8C' },
    }),
  );

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_dummy_fallback') {
    await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'support@immisign.app',
      to: [email.trim().toLowerCase()],
      subject: `Invitation to join ${agency?.name || 'ImmiSign'}`,
      html: html as string,
    });
  } else {
    console.info('[invite] RESEND not configured. Invite URL:', inviteUrl);
  }

  return NextResponse.json({ success: true, invitationId: invitation.id, inviteUrl });
}
