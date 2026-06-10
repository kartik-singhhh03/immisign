import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminRest } from '@/lib/supabase/admin-rest';
import { dbRoleToUi } from '@/lib/auth/db-roles';
import { createRmaFromInvite } from '@/lib/rma/create-from-invite';
import { stripeService } from '@/lib/stripe/service';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';

export async function POST(req: NextRequest) {
  const { token, password, full_name } = (await req.json()) as {
    token?: string;
    password?: string;
    full_name?: string;
  };

  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Token and password (min 8 characters) are required' },
      { status: 400 },
    );
  }

  const { data: rows, error: inviteError } = await adminRest<
    Array<{
      id: string;
      email: string;
      role: string;
      agency_id: string;
      expires_at: string;
      accepted_at: string | null;
      marn?: string | null;
      full_name?: string | null;
    }>
  >(`invitations?token=eq.${encodeURIComponent(token)}&select=*&limit=1`);

  const invite = rows?.[0];
  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invitation already used' }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }

  const displayName = full_name?.trim() || invite.email.split('@')[0];
  const admin = createAdminClient();

  const { data: agencyRows } = await adminRest<Array<{ slug: string; name: string }>>(
    `agencies?id=eq.${invite.agency_id}&select=slug,name&limit=1`,
  );
  const agency = agencyRows?.[0];

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === invite.email.toLowerCase(),
  );

  let userId: string;

  if (existing) {
    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || 'Could not create user' }, { status: 500 });
    }
    userId = created.user.id;
  }

  const { error: profileError } = await (admin as any).from('users').upsert(
    {
      id: userId,
      agency_id: invite.agency_id,
      full_name: displayName,
      email: invite.email,
      role: invite.role,
      is_active: true,
      email_verified: true,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await createRmaFromInvite(
    admin,
    userId,
    {
      agency_id: invite.agency_id,
      email: invite.email,
      role: invite.role,
      marn: invite.marn,
      full_name: displayName,
    },
    (invite as { phone?: string }).phone,
  );

  await adminRest(`invitations?id=eq.${invite.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ accepted_at: new Date().toISOString() }),
  });

  try {
    await stripeService.syncSubscriptionSeats(invite.agency_id);
  } catch (syncErr) {
    console.error('SEAT_SYNC_AFTER_ACCEPT', syncErr);
  }

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

  return NextResponse.json({
    success: true,
    email: invite.email,
    role: dbRoleToUi(invite.role),
    agency_slug: agency?.slug,
  });
}
