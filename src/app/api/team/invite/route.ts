import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResendFromEmail, sendEmailWithForensicLogging } from '@/lib/email/resend';
import { getAgencySeatSnapshot } from '@/lib/stripe/seats';
import { stripeService } from '@/lib/stripe/service';
import { formatZodError } from '@/lib/validations/fields';
import { teamInviteSchema } from '@/lib/validations/schemas';

const INVITE_ROLE_MAP: Record<string, string> = {
  Owner: 'owner',
  Admin: 'admin',
  'Migration Agent': 'agent',
  'Case Manager': 'manager',
  Assistant: 'viewer',
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('INVITE_FAILURE', authError || new Error('No authenticated user'));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('STEP_1_AUTH_SUCCESS');

    const raw = await req.json();
    const parsedInvite = teamInviteSchema.safeParse(raw);
    if (!parsedInvite.success) {
      return NextResponse.json({ error: formatZodError(parsedInvite.error) }, { status: 400 });
    }
    const { name, email, role, marn } = parsedInvite.data;
    const normalizedRole = normalizeInviteRole(role);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('agency_id, role, email, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('INVITE_FAILURE', userError || new Error('User workspace not found'));
      return NextResponse.json({ error: 'User workspace not found' }, { status: 404 });
    }

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

    const seatPreview = await getAgencySeatSnapshot(supabase, userData.agency_id, {
      includePendingInviteRole: normalizedRole,
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitePayload = {
      agency_id: userData.agency_id,
      email,
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

    const fromEmail = getResendFromEmail();
    const apiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());
    const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'unknown';

    console.log('STEP_5_EMAIL_SEND_START');
    console.log('RESEND_CONFIG', {
      fromEmail,
      apiKeyExists,
      domain,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    try {
      const emailResult = await sendEmailWithForensicLogging({
        from: fromEmail,
        to: email,
        subject: 'You have been invited to join an ImmiSign Workspace',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join an ImmiSign workspace as a <strong>${normalizedRole}</strong>.</p>
            <p>Click the link below to accept the invitation and set up your account:</p>
            <div style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #0D9F8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
          </div>
        `,
      });
      console.log('RESEND_RAW_RESPONSE', JSON.stringify(emailResult, null, 2));
      console.log('STEP_6_EMAIL_SEND_SUCCESS');

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
