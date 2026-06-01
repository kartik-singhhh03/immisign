import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signwellClient } from '@/lib/signwell/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, agencyId, signers, emailSubject, emailMessage } = body;

    // 1. Fetch the document record
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('agency_id', agencyId)
      .single();

    if (!document) {
      throw new Error("Document not found or unauthorized");
    }

    // 2. Determine bucket based on agreement_id presence
    const bucket = document.agreement_id ? 'secure_documents' : 'documents';

    // 3. Get a signed URL for SignWell
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.file_url, 3600);

    if (urlError || !urlData?.signedUrl) {
      throw new Error("Could not generate signed URL for document: " + (urlError?.message || "Unknown error"));
    }

    // 4. Insert Signers into Database
    const signersToInsert = signers.map((s: any, idx: number) => ({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      document_id: documentId,
      full_name: s.name,
      email: s.email,
      phone: null,
      signing_order: s.order || 1,
      verification_method: 'email',
      verification_status: 'pending'
    }));

    const { error: signersErr } = await supabase.from('signers').insert(signersToInsert);
    if (signersErr) {
      console.warn("Could not insert signers into DB:", signersErr.message);
    }

    // 5. Map signers for SignWell
    const signwellSigners = signers.map((s: any, idx: number) => ({
      id: s.id || `signer_${idx}`,
      name: s.name,
      email: s.email,
      routing_order: s.order || 1,
      role: s.role || 'Signer',
      message: emailMessage
    }));

    // 6. Create Document via SignWell Service
    const signwellData = await signwellClient.createDocument({
      test_mode: process.env.NODE_ENV !== 'production',
      name: document.file_name,
      subject: emailSubject,
      message: emailMessage,
      files: [{ name: document.file_name, file_url: urlData.signedUrl }],
      recipients: signwellSigners,
      expires_in: 30,
      with_signature_page: true,
      draft: true, // we send it immediately below
    });

    // 6. Send Document via SignWell
    await signwellClient.sendDocument(signwellData.id);

    // 7. Log Activity
    await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      user_id: user.id,
      type: 'document',
      title: 'Document Sent for Signature',
      description: `Document '${document.file_name}' sent to ${signers.length} signer(s).`,
      reference_id: documentId,
      reference_type: 'document',
    });

    return NextResponse.json({
      success: true,
      signwellResult: signwellData
    });

  } catch (err: any) {
    console.error("Document Dispatch Error Stack:", err.stack);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
