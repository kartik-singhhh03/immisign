import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRmaFromInvite } from '@/lib/rma/create-from-invite';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import { validatePassword } from '@/lib/auth/password-policy';
import { logSecurityEvent, getRequestMeta } from '@/lib/security/audit-log';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { token, password, fullName, phone } = await req.json();

    // 1. Fetch invitation (service role — invitee is not authenticated yet)
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

    // 2. Create Auth User in Supabase
    // Using service role to bypass email confirmation if needed, but since we are doing standard auth signup:
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
       // if user already exists, we might need a different flow, but for now we error
       return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
       return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 3. Create user record in 'users' table linking to agency
    const { error: userRecordError } = await supabase
      .from('users')
      .insert({
        id: userId,
        agency_id: invite.agency_id,
        email: invite.email,
        full_name: fullName,
        phone: phone || null,
        role: invite.role,
        email_verified: true,
        is_active: true
      });

    if (userRecordError) {
      return NextResponse.json({ error: 'Failed to create workspace user record.' }, { status: 500 });
    }

    await createRmaFromInvite(admin, userId, {
      agency_id: invite.agency_id,
      email: invite.email,
      role: invite.role,
      marn: invite.marn,
      full_name: fullName,
    }, phone);

    // 4. Mark invitation as accepted
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
        message: `${fullName} accepted their invitation and joined the workspace.`,
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
      description: `${fullName} joined the workspace`,
      reference_id: userId,
      reference_type: 'user',
    });

    const meta = getRequestMeta(req);
    await logSecurityEvent(admin, {
      agencyId: invite.agency_id,
      userId,
      eventType: 'invite.accepted',
      ...meta,
      metadata: { role: invite.role, email: invite.email },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
