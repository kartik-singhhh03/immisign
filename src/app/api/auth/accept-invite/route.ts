import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRmaFromInvite } from '@/lib/rma/create-from-invite';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { token, password, fullName, phone } = await req.json();

    // 1. Fetch invitation
    const { data: invite, error: inviteError } = await supabase
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

    // 2. Create Auth User in Supabase
    // Using service role to bypass email confirmation if needed, but since we are doing standard auth signup:
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: password,
      options: {
        data: { full_name: fullName, role: invite.role }
      }
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

    const admin = createAdminClient();
    await createRmaFromInvite(admin, userId, {
      agency_id: invite.agency_id,
      email: invite.email,
      role: invite.role,
      marn: invite.marn,
      full_name: fullName,
    }, phone);

    // 4. Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
