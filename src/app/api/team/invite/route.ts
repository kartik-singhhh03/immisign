import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResendFromEmail, sendEmailWithForensicLogging } from '@/lib/email/resend';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, marn } = await req.json();
    
    // Get active tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User workspace not found' }, { status: 404 });
    }

    const agencyId = userData.agency_id;
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Save invitation
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        agency_id: agencyId,
        email,
        role: role || 'agent',
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json({ error: 'Failed to create invitation: ' + inviteError.message }, { status: 500 });
    }

    // Send email using Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;
    
    try {
      await sendEmailWithForensicLogging({
        from: getResendFromEmail(),
        to: email,
        subject: 'You have been invited to join an ImmiSign Workspace',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join an ImmiSign workspace as a <strong>${role}</strong>.</p>
            <p>Click the link below to accept the invitation and set up your account:</p>
            <div style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #0D9F8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
          </div>
        `
      });
    } catch (e) {
      console.error("Resend email failed:", e);
      await supabase.from('invitations').delete().eq('id', invite.id);
      return NextResponse.json(
        { error: 'Invitation email failed to send. Invite rolled back.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, invite });

  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
