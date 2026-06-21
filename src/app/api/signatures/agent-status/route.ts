import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userHasUploadedProfessionalSignature } from '@/lib/signatures/professional-signature';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', auth.user.id)
    .single();

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'No agency context' }, { status: 400 });
  }

  const userId = req.nextUrl.searchParams.get('userId')?.trim() || auth.user.id;

  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in workspace' }, { status: 404 });
  }

  const hasUploadedSignature = await userHasUploadedProfessionalSignature(
    supabase,
    profile.agency_id,
    userId,
  );

  return NextResponse.json({ userId, hasUploadedSignature });
}
