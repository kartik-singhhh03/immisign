import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function normalizeType(value: string) {
  if (value === 'upload' || value === 'draw' || value === 'type') return value;
  return null;
}

async function resolveProfile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase.from('users').select('agency_id,id').eq('id', user.id).single();
  if (!profile?.agency_id) return { error: NextResponse.json({ error: 'No agency context' }, { status: 400 }) };

  return { user, profile };
}

export async function GET() {
  const resolved = await resolveProfile();
  if ('error' in resolved && resolved.error) return resolved.error;
  const { user, profile } = resolved as { user: { id: string }; profile: { agency_id: string; id: string } };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_signatures')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signatures: data || [] });
}

export async function POST(req: Request) {
  const resolved = await resolveProfile();
  if ('error' in resolved && resolved.error) return resolved.error;
  const { user, profile } = resolved as { user: { id: string }; profile: { agency_id: string; id: string } };

  const supabase = await createClient();
  const admin = createAdminClient();
  const form = await req.formData();
  const signatureTypeRaw = String(form.get('signature_type') || '').toLowerCase();
  const signatureType = normalizeType(signatureTypeRaw);
  if (!signatureType) return NextResponse.json({ error: 'Invalid signature_type' }, { status: 400 });

  let storagePath: string | null = null;
  let typedName: string | null = null;
  let drawData: string | null = null;

  if (signatureType === 'upload') {
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'File is required for upload signatures' }, { status: 400 });
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const objectPath = `${profile.agency_id}/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('signatures').upload(objectPath, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    storagePath = objectPath;
  }

  if (signatureType === 'draw') {
    drawData = String(form.get('draw_data') || '');
    if (!drawData) return NextResponse.json({ error: 'draw_data is required for draw signatures' }, { status: 400 });
  }

  if (signatureType === 'type') {
    typedName = String(form.get('typed_name') || '').trim();
    if (!typedName) return NextResponse.json({ error: 'typed_name is required for type signatures' }, { status: 400 });
  }

  const isDefault = String(form.get('is_default') || 'false') === 'true';
  if (isDefault) {
    await admin
      .from('user_signatures')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('agency_id', profile.agency_id)
      .eq('user_id', user.id);
  }

  const { data, error } = await admin
    .from('user_signatures')
    .insert({
      agency_id: profile.agency_id,
      user_id: user.id,
      signature_type: signatureType,
      storage_path: storagePath,
      typed_name: typedName,
      draw_data: drawData,
      is_default: isDefault,
      label: signatureType,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, signature: data });
}
