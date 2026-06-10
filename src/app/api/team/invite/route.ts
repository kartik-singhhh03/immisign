import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { getResendFromEmail, sendEmailWithForensicLogging } from '@/lib/email/resend';
import { resolveAppUrl } from '@/lib/env';
import { APP_NAME } from '@/lib/brand';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { formatZodError } from '@/lib/validations/fields';
import { teamInviteSchema } from '@/lib/validations/schemas';
import { logSecurityEvent } from '@/lib/security/audit-log';

const INVITE_ROLE_MAP: Record<string, string> = {
  Owner: 'owner',
  Admin: 'admin',
  'Migration Agent': 'agent',
  'Case Manager': 'manager',
  Assistant: 'support',
  'Read-only staff': 'viewer',
  owner: 'owner',
  admin: 'admin',
  agent: 'agent',
  manager: 'manager',
  viewer: 'viewer',
  reviewer: 'reviewer',
  support: 'support',
};

function normalizeInviteRole(role: string | undefined): string {
  if (!role) return 'agent';
  return INVITE_ROLE_MAP[role] ?? role.toLowerCase();
}

export async function POST(req: Request) {
  console.log('INVITE_START');

  try {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const supabase = ctx.supabase;
    const user = { id: ctx.userId };
    const userData = {
      agency_id: ctx.agencyId,
      role: ctx.dbRole,
      email: ctx.profile.email as string,
      full_name: ctx.profile.full_name as string,
    };

    console.log('STEP_1_AUTH_SUCCESS');

    const raw = await req.json();
    const parsedInvite = teamInviteSchema.safeParse(raw);
    if (!parsedInvite.success) {
      return NextResponse.json({ error: formatZodError(parsedInvite.error) }, { status: 400 });
    }
    const { name, email, role, marn } = parsedInvite.data;
    const normalizedRole = normalizeInviteRole(role);

    console.log('STEP_2_USER_LOOKUP_SUCCESS');
    console.log('AUTH_USER_ID', user.id);
    console.log('EMAIL', user.email);
    console.log('ROLE', userData.role);
    console.log('AGENCY_ID', userData.agency_id);

    if (!['owner', 'admin'].includes(userData.role)) {
      const forbidden = new Error(`Only owners and admins can invite team members (current role: ${userData.role})`);
      console.error('INVITE_FAILURE', forbidden);
      return NextResponse.json({ error: forbidden.message }, { status: 403 });
    }

    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('id', userData.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error('INVITE_FAILURE', agencyError || new Error('Agency not found'));
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    console.log('STEP_3_AGENCY_LOOKUP_SUCCESS', { agencyId: agency.id, agencyName: agency.name });

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingMember } = await supabase
      .from('users')
      .select('id')
      .eq('agency_id', userData.agency_id)
      .ilike('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'This person is already a member of your workspace.' },
        { status: 409 },
      );
    }

    const { data: pendingInvite } = await supabase
      .from('invitations')
      .select('*')
      .eq('agency_id', userData.agency_id)
      .ilike('email', normalizedEmail)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (pendingInvite) {
      const pendingInviteUrl = `${resolveAppUrl()}/invite/${pendingInvite.token}`;
      const fromEmail = getResendFromEmail();

      try {
        await sendEmailWithForensicLogging(
          {
            from: fromEmail,
            to: normalizedEmail,
            subject: `You have been invited to join a ${APP_NAME} workspace`,
            html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join a ${APP_NAME} workspace as a <strong>${pendingInvite.role}</strong>.</p>
            <p>Click the link below to accept the invitation and set up your account:</p>
            <div style="margin: 30px 0;">
              <a href="${pendingInviteUrl}" style="background-color: #111111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
          </div>
        `,
          },
          { emailType: 'team_invite', agencyId: userData.agency_id },
        );

        await supabase.from('activity_logs').insert({
          agency_id: userData.agency_id,
          user_id: user.id,
          type: 'team.invite_sent',
          title: 'Team invitation resent',
          description: `Resent invitation to ${normalizedEmail} as ${pendingInvite.role}`,
          reference_id: pendingInvite.id,
          reference_type: 'invitation',
        });

        await logSecurityEvent(supabase, {
          agencyId: userData.agency_id,
          userId: user.id,
          eventType: 'invite.sent',
          metadata: { email: normalizedEmail, role: pendingInvite.role, invite_id: pendingInvite.id, resent: true },
        });
      } catch (emailError: unknown) {
        const err = emailError as Error;
        return NextResponse.json(
          { error: 'Failed to resend pending invitation.', detail: err.message },
          { status: 502 },
        );
      }

      const seatPreview = await getAgencySeatSnapshot(supabase, userData.agency_id, {
        includePendingInviteRole: pendingInvite.role,
      });

      return NextResponse.json({
        success: true,
        invite: pendingInvite,
        resent: true,
        message: 'A pending invitation already exists for this email. Invitation resent.',
        billing: {
          wouldIncreaseSubscription: seatPreview.wouldIncreaseSubscription,
          warning: null,
          monthlyTotalUsd: seatPreview.monthlyTotalUsd,
        },
      });
    }

    const seatPreview = await getAgencySeatSnapshot(supabase, userData.agency_id, {
      includePendingInviteRole: normalizedRole,
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitePayload = {
      agency_id: userData.agency_id,
      email: normalizedEmail,
      role: normalizedRole,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
      full_name: name || null,
      marn: marn || null,
    };

    console.log('STEP_4_INVITE_INSERT_ATTEMPT', {
      agency_id: invitePayload.agency_id,
      email: invitePayload.email,
      role: invitePayload.role,
      created_by: invitePayload.created_by,
    });

    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .insert(invitePayload)
      .select()
      .single();

    if (inviteError) {
      console.error('INVITE_FAILURE', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation: ' + inviteError.message },
        { status: 500 }
      );
    }

    console.log('STEP_4_INVITE_INSERT_SUCCESS', { inviteId: invite.id });

    await logSecurityEvent(supabase, {
      agencyId: userData.agency_id,
      userId: user.id,
      eventType: 'invite.created',
      metadata: { email, role: normalizedRole, invite_id: invite.id },
    });

    const fromEmail = getResendFromEmail();
    const apiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());
    const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'unknown';

    console.log('STEP_5_EMAIL_SEND_START');
    console.log('RESEND_CONFIG', {
      fromEmail,
      apiKeyExists,
      domain,
    });

    const inviteUrl = `${resolveAppUrl()}/invite/${token}`;

    try {
      const emailResult = await sendEmailWithForensicLogging({
        from: fromEmail,
        to: email,
        subject: `You have been invited to join a ${APP_NAME} workspace`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join a ${APP_NAME} workspace as a <strong>${normalizedRole}</strong>.</p>
            <p>Click the link below to accept the invitation and set up your account:</p>
            <div style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #111111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
          </div>
        `,
      }, { emailType: 'team_invite', agencyId: userData.agency_id });
      console.log('RESEND_RAW_RESPONSE', JSON.stringify(emailResult, null, 2));
      console.log('STEP_6_EMAIL_SEND_SUCCESS');

      await supabase.from('activity_logs').insert({
        agency_id: userData.agency_id,
        user_id: user.id,
        type: 'team.invite_sent',
        title: 'Team invitation sent',
        description: `Invited ${email} as ${normalizedRole}`,
        reference_id: invite.id,
        reference_type: 'invitation',
      });

      await logSecurityEvent(supabase, {
        agencyId: userData.agency_id,
        userId: user.id,
        eventType: 'invite.sent',
        metadata: { email, role: normalizedRole, invite_id: invite.id },
      });

      try {
        await stripeService.syncSubscriptionSeats(userData.agency_id);
      } catch (syncErr) {
        console.error('SEAT_SYNC_AFTER_INVITE', syncErr);
      }
    } catch (emailError: unknown) {
      console.error('INVITE_FAILURE', emailError);
      await supabase.from('invitations').delete().eq('id', invite.id);

      const err = emailError as Error;
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        {
          error: 'Invitation email failed to send. Invite rolled back.',
          detail: err.message,
          ...(isDev ? { stack: err.stack } : {}),
          lastSuccessfulStep: 'STEP_4_INVITE_INSERT_SUCCESS',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      invite,
      billing: {
        wouldIncreaseSubscription: seatPreview.wouldIncreaseSubscription,
        warning: seatPreview.wouldIncreaseSubscription
          ? `Adding this user will increase your subscription by $${seatPreview.nextSeatIncreaseUsd}/month.`
          : null,
        monthlyTotalUsd: seatPreview.monthlyTotalUsd,
      },
    });
  } catch (error: unknown) {
    console.error('INVITE_FAILURE', error);
    const err = error as Error;
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: err.message,
        ...(isDev ? { stack: err.stack } : {}),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const inviteId = typeof body?.inviteId === 'string' ? body.inviteId.trim() : '';
    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('agency_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.agency_id || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: invite } = await supabase
      .from('invitations')
      .select('id, email, role, agency_id, accepted_at')
      .eq('id', inviteId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Cannot revoke an accepted invitation' }, { status: 410 });
    }

    const { error: deleteError } = await supabase.from('invitations').delete().eq('id', invite.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await supabase.from('activity_logs').insert({
      agency_id: profile.agency_id,
      user_id: user.id,
      type: 'team.invite_revoked',
      title: 'Team invitation revoked',
      description: `Revoked invitation for ${invite.email}`,
      reference_id: invite.id,
      reference_type: 'invitation',
    });

    await logSecurityEvent(supabase, {
      agencyId: profile.agency_id,
      userId: user.id,
      eventType: 'invite.revoked',
      metadata: { email: invite.email, role: invite.role, invite_id: invite.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Revoke failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
