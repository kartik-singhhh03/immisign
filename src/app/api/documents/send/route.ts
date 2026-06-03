import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { signwellClient } from '@/lib/signwell/client';
import { applySenderSignatureOnDocumentSend } from '@/lib/signatures/document-sender-signature';
import { filterExternalDocumentSigners } from '@/lib/signatures/rma-signature';
import { generateSenderAttestationPdf } from '@/lib/signatures/sender-attestation-pdf';
import { buildSignwellDispatchExtras } from '@/lib/signwell/dispatch-extras';
import { createAndSendSignwellDocument, resumeSignwellDocumentIfDraft } from '@/lib/signwell/document-dispatch';
import { buildMultiFileSignatureFields } from '@/lib/signwell/signature-fields';
import {
  findDuplicateRecipientEmails,
  friendlySignwellError,
} from '@/lib/signwell/recipient-validation';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';

export async function POST(req: NextRequest) {
  try {
    let supabase = (await createClient()) as any;
    let {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const rawClient = createRawClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        const { data: { user: tokenUser } } = await rawClient.auth.getUser();
        if (tokenUser) {
          supabase = rawClient as any;
          user = tokenUser;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      documentId,
      agencyId,
      signers,
      emailSubject,
      emailMessage,
      ccMe,
      autoRemind7Days,
      emailOnComplete,
    } = body;

    const { data: senderProfile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    const senderEmail = senderProfile?.email || user.email || '';
    const senderName = senderProfile?.full_name || '';

    const externalSigners = filterExternalDocumentSigners(signers || [], senderEmail);

    if (externalSigners.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Add at least one external signer (client/sponsor). Your agent signature is applied automatically — do not add yourself as a signer.',
        },
        { status: 400 },
      );
    }

    const recipientEmails = externalSigners.map((s: { email: string }) => s.email);
    const duplicate = findDuplicateRecipientEmails(recipientEmails);
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate signer email: ${duplicate}. Each recipient must have a unique email.`,
        },
        { status: 422 },
      );
    }

    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('agency_id', agencyId)
      .single();

    if (!document) {
      throw new Error('Document not found or unauthorized');
    }

    await applySenderSignatureOnDocumentSend(supabase, agencyId, documentId, user.id);

    const bucket = document.agreement_id ? 'secure_documents' : 'documents';

    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.file_url, 3600);

    if (urlError || !urlData?.signedUrl) {
      throw new Error(
        'Could not generate signed URL for document: ' + (urlError?.message || 'Unknown error'),
      );
    }

    const attestationPdf = await generateSenderAttestationPdf(
      supabase,
      agencyId,
      user.id,
      document.file_name || document.original_name,
    );

    const attestationPath = `${agencyId}/attestations/${documentId}-sender.pdf`;
    const { error: attestationUploadErr } = await supabase.storage
      .from(bucket)
      .upload(attestationPath, attestationPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (attestationUploadErr) {
      throw new Error('Failed to store sender attestation PDF: ' + attestationUploadErr.message);
    }

    const { data: attestationUrlData, error: attestationUrlErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(attestationPath, 3600);

    if (attestationUrlErr || !attestationUrlData?.signedUrl) {
      throw new Error('Could not generate signed URL for attestation PDF');
    }

    const signersToInsert = externalSigners.map((s: any, idx: number) => ({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      document_id: documentId,
      agreement_id: document.agreement_id || null,
      full_name: s.name,
      email: s.email,
      signing_order: s.order || idx + 1,
      verification_method: 'email',
      verification_status: 'pending',
    }));

    const { error: signersErr } = await supabase.from('signers').insert(signersToInsert);
    if (signersErr) {
      console.warn('Could not insert signers into DB:', signersErr.message);
    }

    const dispatchExtras = buildSignwellDispatchExtras(
      {
        dispatchOptions: {
          emailMessage,
          emailSubject,
          ccMe,
          autoRemind7Days,
          emailOnComplete,
        },
        agreementTitle: document.file_name,
        sender: { email: senderEmail, name: senderName },
      },
      externalSigners.map((s: { email: string }) => s.email),
    );

    const signwellSigners = externalSigners.map((s: any, idx: number) => ({
      id: String(s.id || `signer_${idx + 1}`),
      name: s.name,
      email: s.email.trim().toLowerCase(),
      routing_order: s.order || idx + 1,
      role: s.role || 'Signer',
    }));

    const pageCount = Math.max(1, Number(body.pageCount) || 1);
    const signwellFiles = [
      { name: document.file_name, file_url: urlData.signedUrl },
      { name: 'Agent-Certification.pdf', file_url: attestationUrlData.signedUrl },
    ];

    const signwellPayload = {
      test_mode: process.env.NODE_ENV !== 'production',
      name: document.file_name,
      files: signwellFiles,
      recipients: signwellSigners,
      expires_in: 30,
      with_signature_page: false,
      text_tags: true,
      apply_signing_order: signwellSigners.length > 1,
      fields: buildMultiFileSignatureFields(
        signwellSigners.map((s) => ({ id: s.id, name: s.name, email: s.email })),
        signwellFiles.length,
        { lastPage: pageCount },
      ),
      ...dispatchExtras,
    };

    let sentDoc;
    try {
      if (document.signwell_document_id) {
        sentDoc = await resumeSignwellDocumentIfDraft(document.signwell_document_id);
      } else {
        sentDoc = await createAndSendSignwellDocument(signwellPayload);
      }
    } catch (signwellErr: unknown) {
      const raw = signwellErr instanceof Error ? signwellErr.message : String(signwellErr);
      const friendly = friendlySignwellError(raw);
      await supabase
        .from('documents')
        .update({
          signwell_dispatch_error: friendly,
          sender_attestation_path: attestationPath,
        })
        .eq('id', documentId)
        .eq('agency_id', agencyId);
      return NextResponse.json({ success: false, error: friendly }, { status: 422 });
    }

    const signingLinks = (sentDoc.signers || [])
      .filter((s) => s.signing_url)
      .map((s) => ({ email: s.email, name: s.name, signing_url: s.signing_url }));

    await supabase
      .from('documents')
      .update({
        signwell_document_id: sentDoc.id,
        signwell_status: sentDoc.status || 'sent',
        signwell_sent_at: new Date().toISOString(),
        signwell_dispatch_error: null,
        sender_attestation_path: attestationPath,
        signwell_external_signer_count: externalSigners.length,
        signwell_signing_links: signingLinks,
      })
      .eq('id', documentId)
      .eq('agency_id', agencyId);

    await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      user_id: user.id,
      type: 'document',
      title: 'Document Sent for Signature',
      description: `Document '${document.file_name}' sent to ${externalSigners.length} external signer(s). Agent attestation PDF included.`,
      reference_id: documentId,
      reference_type: 'document',
    });

    const { data: agencyRow } = await supabase.from('agencies').select('slug').eq('id', agencyId).single();
    const notify = new NotificationService(supabase);
    await notify.notify({
      agencyId,
      userId: user.id,
      type: 'document',
      title: 'Document sent for signature',
      message: `${document.file_name} was sent via SignWell.`,
      actionUrl: buildWorkspaceActionUrl(agencyRow?.slug || 'workspace', '/documents/library'),
      entityType: 'document',
      entityId: documentId,
      actorId: user.id,
    });

    await supabase
      .from('send_document_drafts')
      .delete()
      .eq('agency_id', agencyId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      signwellResult: sentDoc,
      signwellDocumentId: sentDoc.id,
      externalSignerCount: externalSigners.length,
      senderAutoSigned: true,
      agentAttestationIncluded: true,
      signingLinks,
      message:
        'Agent certification is stored separately. Only external signers receive SignWell requests on the uploaded document.',
    });
  } catch (err: unknown) {
    console.error('Document Dispatch Error Stack:', err);
    const message = err instanceof Error ? err.message : 'Dispatch failed';
    return NextResponse.json(
      { success: false, error: friendlySignwellError(message) },
      { status: 500 },
    );
  }
}
