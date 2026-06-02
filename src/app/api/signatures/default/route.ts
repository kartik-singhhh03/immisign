import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const signatureId = String(body?.signatureId || '');
  if (!signatureId) return NextResponse.json({ error: 'signatureId is required' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('agency_id,id').eq('id', user.id).single();
  if (!profile?.agency_id) return NextResponse.json({ error: 'No agency context' }, { status: 400 });

  await supabase
    .from('user_signatures')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('user_signatures')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', signatureId)
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, signature: data });
}
