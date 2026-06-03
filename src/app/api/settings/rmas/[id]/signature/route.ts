import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('agency_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const rmaId = params.id;
    const { data: rma } = await supabase
      .from('rmas')
      .select('id, agency_id, user_id')
      .eq('id', rmaId)
      .eq('agency_id', profile.agency_id)
      .single();

    if (!rma) {
      return NextResponse.json({ error: 'RMA not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    let signature_mode: 'upload' | 'typed' = 'typed';
    let signature_url: string | null = null;
    let signature_text: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const mode = String(form.get('signature_mode') || 'typed');
      signature_mode = mode === 'upload' ? 'upload' : 'typed';

      if (signature_mode === 'upload') {
        const file = form.get('file');
        if (!(file instanceof File)) {
          return NextResponse.json({ error: 'Signature file required' }, { status: 400 });
        }
        const admin = createAdminClient();
        const objectPath = `${profile.agency_id}/${rma.user_id}/rma-signature-${Date.now()}.png`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await admin.storage
          .from('signatures')
          .upload(objectPath, buffer, {
            contentType: file.type || 'image/png',
            upsert: true,
          });
        if (uploadError) {
          return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }
        signature_url = objectPath;
        signature_text = null;
      } else {
        signature_text = String(form.get('signature_text') || '').trim() || null;
        signature_url = null;
      }
    } else {
      const body = await req.json();
      signature_mode = body.signature_mode === 'upload' ? 'upload' : 'typed';
      signature_text = body.signature_text?.trim() || null;
      signature_url = body.signature_url || null;
    }

    const { data: updated, error } = await supabase
      .from('rmas')
      .update({
        signature_mode,
        signature_url,
        signature_text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rmaId)
      .select('id, signature_mode, signature_url, signature_text')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rma: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
