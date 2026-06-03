import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function resolveAgencyId() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase.from('users').select('agency_id').eq('id', auth.user.id).single();
  if (!profile?.agency_id) return { error: NextResponse.json({ error: 'No agency context' }, { status: 400 }) };

  return { agencyId: profile.agency_id as string, userId: auth.user.id };
}

export async function POST(req: Request) {
  const resolved = await resolveAgencyId();
  if ('error' in resolved && resolved.error) return resolved.error;
  const { agencyId } = resolved as { agencyId: string };

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const admin = createAdminClient();
  const objectPath = `${agencyId}/logo.${ext}`;

  const { data: existing } = await admin.from('branding_settings').select('logo_url').eq('agency_id', agencyId).maybeSingle();
  if (existing?.logo_url?.includes('/agency_logos/')) {
    const oldPath = existing.logo_url.split('/agency_logos/')[1];
    if (oldPath) await admin.storage.from('agency_logos').remove([oldPath]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from('agency_logos').upload(objectPath, buffer, {
    contentType: file.type || 'image/png',
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicData } = admin.storage.from('agency_logos').getPublicUrl(objectPath);
  const logoUrl = publicData.publicUrl;

  const { error: upsertError } = await admin.from('branding_settings').upsert(
    { agency_id: agencyId, logo_url: logoUrl, updated_at: new Date().toISOString() },
    { onConflict: 'agency_id' }
  );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ success: true, logoUrl });
}

export async function DELETE() {
  const resolved = await resolveAgencyId();
  if ('error' in resolved && resolved.error) return resolved.error;
  const { agencyId } = resolved as { agencyId: string };

  const admin = createAdminClient();
  const { data: branding } = await admin.from('branding_settings').select('logo_url').eq('agency_id', agencyId).maybeSingle();

  if (branding?.logo_url?.includes('/agency_logos/')) {
    const oldPath = branding.logo_url.split('/agency_logos/')[1];
    if (oldPath) await admin.storage.from('agency_logos').remove([oldPath]);
  }

  await admin.from('branding_settings').upsert(
    { agency_id: agencyId, logo_url: null, updated_at: new Date().toISOString() },
    { onConflict: 'agency_id' }
  );

  return NextResponse.json({ success: true });
}
