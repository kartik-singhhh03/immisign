import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRmaFromInvite } from '@/lib/rma/create-from-invite';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import { validatePassword } from '@/lib/auth/password-policy';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';
import { formatZodError } from '@/lib/validations/fields';
import { acceptInviteSchema } from '@/lib/validations/schemas';

export async function POST(req: Request) {
  try {
    const admin = createAdminClient();
    const raw = await req.json();
    const parsedBody = acceptInviteSchema.safeParse({
      token: raw.token,
      password: raw.password,
      fullName: raw.fullName,
      phone: raw.phone,
    });
    if (!parsedBody.success) {
      return NextResponse.json({ error: formatZodError(parsedBody.error) }, { status: 400 });
    }
    const { token, password, fullName, phone } = parsedBody.data;

    const { data: invite, error: inviteError } = await admin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation expired.' }, { status: 400 });
    }

    const policy = validatePassword(password);
    if (!policy.valid) {
      return NextResponse.json({ error: policy.errors.join(' ') }, { status: 400 });
    }

    const displayName = (fullName || '').trim() || invite.email.split('@')[0];
    const email = invite.email.trim().toLowerCase();

    // Service-role createUser — no Supabase signup confirmation email (avoids rate limits).
    let userId: string;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

    if (!authError && authData?.user) {
      userId = authData.user.id;
    } else if (authError && /already|exists|registered/i.test(authError.message)) {
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!existing) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      userId = existing.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 },
      );
    }

    const { error: userRecordError } = await (admin as any).from('users').upsert(
      {
        id: userId,
        agency_id: invite.agency_id,
        email,
        full_name: displayName,
        phone: phone || null,
        role: invite.role,
        email_verified: true,
        is_active: true,
      },
      { onConflict: 'id' },
    );

    if (userRecordError) {
      return NextResponse.json({ error: 'Failed to create workspace user record.' }, { status: 500 });
    }

    await createRmaFromInvite(
      admin,
      userId,
      {
        agency_id: invite.agency_id,
        email,
        role: invite.role,
        marn: invite.marn,
        full_name: displayName,
      },
      phone,
    );

    await admin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    const { data: agency } = await admin
      .from('agencies')
      .select('slug')
      .eq('id', invite.agency_id)
      .single();

    const { data: admins } = await admin
      .from('users')
      .select('id')
      .eq('agency_id', invite.agency_id)
      .in('role', ['owner', 'admin'])
      .neq('id', userId);

    const notifications = new NotificationService(admin);
    const slug = agency?.slug || 'workspace';
    for (const adminUser of admins || []) {
      await notifications.notify({
        agencyId: invite.agency_id,
        userId: adminUser.id,
        type: 'team',
        title: 'Team member joined',
        message: `${displayName} accepted their invitation and joined the workspace.`,
        actionUrl: buildWorkspaceActionUrl(slug, '/settings?section=RmaTeam'),
        entityType: 'user',
        entityId: userId,
        actorId: userId,
      });
    }

    await admin.from('activity_logs').insert({
      agency_id: invite.agency_id,
      user_id: userId,
      type: 'team.joined',
      title: 'Team member joined',
      description: `${displayName} joined the workspace`,
      reference_id: userId,
      reference_type: 'user',
    });

    const meta = getRequestMeta(req);
    await logSecurityEvent(admin, {
      agencyId: invite.agency_id,
      userId,
      eventType: 'invite.accepted',
      ...meta,
      metadata: { role: invite.role, email },
    });

    return NextResponse.json({
      success: true,
      email,
      agency_slug: agency?.slug,
    });
  } catch (error: unknown) {
    console.error('Accept invite error:', error);
    const message = error instanceof Error ? error.message : 'Accept invite failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
