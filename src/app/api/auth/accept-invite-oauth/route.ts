import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminRest } from '@/lib/supabase/admin-rest';
import { dbRoleToUi } from '@/lib/auth/db-roles';
import { createRmaFromInvite } from '@/lib/rma/create-from-invite';

export async function POST(req: Request) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error: inviteErr } = await adminRest<
    Array<{ id: string; email: string; role: string; agency_id: string; expires_at: string; accepted_at: string | null }>
  >(`invitations?token=eq.${encodeURIComponent(token)}&select=*&limit=1`);
  const invite = rows?.[0];
  if (inviteErr || !invite) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Invitation already used' }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });

  if ((user.email || '').toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: 'Signed-in email does not match invitation email' }, { status: 403 });
  }

  const displayName = (user.user_metadata?.full_name as string) || (user.email?.split('@')[0] ?? 'User');
  const admin = createAdminClient();

  const { error: profileErr } = await (admin as any).from('users').upsert(
    {
      id: user.id,
      agency_id: invite.agency_id,
      full_name: displayName,
      email: invite.email,
      role: invite.role,
      is_active: true,
      email_verified: true,
    },
    { onConflict: 'id' },
  );
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  await createRmaFromInvite(admin, user.id, {
    agency_id: invite.agency_id,
    email: invite.email,
    role: invite.role,
    marn: (invite as { marn?: string }).marn,
    full_name: displayName,
  });

  await adminRest(`invitations?id=eq.${invite.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ accepted_at: new Date().toISOString() }),
  });

  return NextResponse.json({
    success: true,
    email: invite.email,
    role: dbRoleToUi(invite.role),
  });
}
