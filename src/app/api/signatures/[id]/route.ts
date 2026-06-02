import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('agency_id,id').eq('id', user.id).single();
  if (!profile?.agency_id) return NextResponse.json({ error: 'No agency context' }, { status: 400 });

  const { data: signature, error: fetchErr } = await supabase
    .from('user_signatures')
    .select('id,storage_path,agency_id,user_id')
    .eq('id', params.id)
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !signature) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  }

  if (signature.storage_path) {
    await supabase.storage.from('signatures').remove([signature.storage_path]);
  }

  const { error } = await supabase.from('user_signatures').delete().eq('id', signature.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
