import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSenderAttestationPdf } from '@/lib/signatures/sender-attestation-pdf';

/**
 * Returns a short-lived signed URL for the sender attestation PDF (agent signature page).
 * Used on the Send Document review step before dispatch.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agencyId, documentName } = await req.json();
    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId required' }, { status: 400 });
    }

    const pdfBuffer = await generateSenderAttestationPdf(
      supabase,
      agencyId,
      user.id,
      documentName || 'Document',
    );

    const previewPath = `${agencyId}/previews/${user.id}-send-preview-${Date.now()}.pdf`;
    const bucket = 'documents';

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(previewPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(previewPath, 300);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message || 'Preview URL failed' }, { status: 500 });
    }

    return NextResponse.json({
      previewUrl: signed.signedUrl,
      expiresInSeconds: 300,
      type: 'agent_attestation',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Preview failed' }, { status: 500 });
  }
}
