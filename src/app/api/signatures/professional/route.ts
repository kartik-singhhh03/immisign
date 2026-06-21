import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  clearUserSignaturePath,
  logSignatureActivity,
  professionalSignatureStoragePath,
  validateProfessionalSignaturePng,
} from '@/lib/signatures/professional-signature';

async function resolveProfile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('agency_id, id, signature_storage_path, signature_uploaded_at')
    .eq('id', user.id)
    .single();

  if (profileErr) {
    return { error: NextResponse.json({ error: profileErr.message }, { status: 500 }) };
  }

  if (!profile?.agency_id) {
    return { error: NextResponse.json({ error: 'No agency context' }, { status: 400 }) };
  }

  return { user, profile, supabase };
}

async function signedPreviewUrl(storagePath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('signatures').createSignedUrl(storagePath, 3600);
  if (error) {
    console.error('SIGNATURE_PREVIEW_URL_FAILED', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function GET() {
  try {
    const resolved = await resolveProfile();
    if ('error' in resolved && resolved.error) return resolved.error;
    const { profile } = resolved as {
      profile: {
        agency_id: string;
        id: string;
        signature_storage_path: string | null;
        signature_uploaded_at: string | null;
      };
    };

    const admin = createAdminClient();
    const { data: defaultSig } = await admin
      .from('user_signatures')
      .select('id, storage_path, signature_type, is_default, updated_at, created_at')
      .eq('agency_id', profile.agency_id)
      .eq('user_id', profile.id)
      .eq('is_default', true)
      .eq('signature_type', 'upload')
      .maybeSingle();

    const storagePath =
      defaultSig?.storage_path || profile.signature_storage_path || null;

    let previewUrl: string | null = null;
    if (storagePath) {
      previewUrl = await signedPreviewUrl(storagePath);
    }

    const signature = storagePath
      ? {
          id: defaultSig?.id || profile.id,
          storagePath,
          uploadedAt:
            profile.signature_uploaded_at ||
            defaultSig?.updated_at ||
            defaultSig?.created_at ||
            null,
          previewUrl,
        }
      : null;

    return NextResponse.json({
      signature,
      hasUploadedSignature: Boolean(storagePath),
    });
  } catch (err) {
    console.error('PROFESSIONAL_SIGNATURE_GET_FAILED', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load signature' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const resolved = await resolveProfile();
    if ('error' in resolved && resolved.error) return resolved.error;
    const { user, profile, supabase } = resolved as {
      user: { id: string };
      profile: { agency_id: string; id: string };
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const admin = createAdminClient();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PNG file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateProfessionalSignaturePng(file, buffer);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const objectPath = professionalSignatureStoragePath(profile.agency_id, user.id);

    const { data: existingDefault } = await admin
      .from('user_signatures')
      .select('id, storage_path')
      .eq('agency_id', profile.agency_id)
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();

    const isReplace = Boolean(existingDefault?.storage_path);
    const oldPath = existingDefault?.storage_path;

    if (oldPath && oldPath !== objectPath) {
      await admin.storage.from('signatures').remove([oldPath]);
    }

    const { error: uploadError } = await admin.storage.from('signatures').upload(objectPath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await admin
      .from('user_signatures')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('agency_id', profile.agency_id)
      .eq('user_id', user.id);

    const now = new Date().toISOString();
    let signatureRow;

    if (existingDefault) {
      const { data, error } = await admin
        .from('user_signatures')
        .update({
          signature_type: 'upload',
          storage_path: objectPath,
          typed_name: null,
          draw_data: null,
          is_default: true,
          label: 'Professional Signature',
          updated_at: now,
        })
        .eq('id', existingDefault.id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      signatureRow = data;
    } else {
      const { data, error } = await admin
        .from('user_signatures')
        .insert({
          agency_id: profile.agency_id,
          user_id: user.id,
          signature_type: 'upload',
          storage_path: objectPath,
          is_default: true,
          label: 'Professional Signature',
        })
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      signatureRow = data;
    }

    await admin
      .from('users')
      .update({
        signature_storage_path: objectPath,
        signature_uploaded_at: now,
        updated_at: now,
      })
      .eq('id', user.id);

    await logSignatureActivity(admin, {
      agencyId: profile.agency_id,
      userId: user.id,
      action: isReplace ? 'replaced' : 'uploaded',
      signatureId: signatureRow.id,
      storagePath: objectPath,
    });

    const previewUrl = await signedPreviewUrl(objectPath);

    return NextResponse.json({
      success: true,
      signature: {
        id: signatureRow.id,
        storagePath: objectPath,
        uploadedAt: now,
        previewUrl,
      },
    });
  } catch (err) {
    console.error('PROFESSIONAL_SIGNATURE_POST_FAILED', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const resolved = await resolveProfile();
    if ('error' in resolved && resolved.error) return resolved.error;
    const { user, profile } = resolved as {
      user: { id: string };
      profile: { agency_id: string; id: string };
    };

    const admin = createAdminClient();
    const { data: defaultSig } = await admin
      .from('user_signatures')
      .select('id, storage_path')
      .eq('agency_id', profile.agency_id)
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();

    if (!defaultSig) {
      return NextResponse.json({ error: 'No professional signature to delete' }, { status: 404 });
    }

    if (defaultSig.storage_path) {
      await admin.storage.from('signatures').remove([defaultSig.storage_path]);
    }

    await admin.from('user_signatures').delete().eq('id', defaultSig.id);
    await clearUserSignaturePath(user.id);

    await logSignatureActivity(admin, {
      agencyId: profile.agency_id,
      userId: user.id,
      action: 'deleted',
      signatureId: defaultSig.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PROFESSIONAL_SIGNATURE_DELETE_FAILED', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
