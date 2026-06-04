import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { signwellClient } from '@/lib/signwell/client';
import { applySenderSignatureOnDocumentSend } from '@/lib/signatures/document-sender-signature';
import { filterExternalDocumentSigners } from '@/lib/signatures/rma-signature';
import { generateSenderAttestationPdf } from '@/lib/signatures/sender-attestation-pdf';
import { buildSignwellDispatchExtras } from '@/lib/signwell/dispatch-extras';
import {
  createAndSendSignwellDocument,
  resumeSignwellDocumentIfDraft,
  signwellDispatchConfirmed,
} from '@/lib/signwell/document-dispatch';
import { buildMultiFileSignatureFields } from '@/lib/signwell/signature-fields';
import {
  findDuplicateRecipientEmails,
  friendlySignwellError,
} from '@/lib/signwell/recipient-validation';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import { signwellTestMode } from '@/lib/signwell/test-mode';
import {
  DispatchStageTracker,
  DOCUMENT_SEND_STAGES,
  signwellEmailDispatched,
} from '@/lib/dispatch/stage-tracker';

function supportRef() {
  return `DOC-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  const tracker = new DispatchStageTracker([...DOCUMENT_SEND_STAGES]);
  const ref = supportRef();

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

    tracker.start('document');
    tracker.complete('document');

    await applySenderSignatureOnDocumentSend(supabase, agencyId, documentId, user.id);

    tracker.start('pdf');
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
      tracker.fail('pdf', 'Could not generate signed URL for attestation PDF');
      return NextResponse.json(
        { success: false, error: 'Could not generate signed URL for attestation PDF', stages: tracker.snapshot(), supportRef: ref },
        { status: 500 },
      );
    }
    tracker.complete('pdf');

    tracker.start('storage');
    tracker.complete('storage');

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
      send_email: true,
      send_email_delay: 0,
    }));

    const pageCount = Math.max(1, Number(body.pageCount) || 1);
    const signwellFiles = [
      { name: document.file_name, file_url: urlData.signedUrl },
      { name: 'Agent-Certification.pdf', file_url: attestationUrlData.signedUrl },
    ];

    const signwellPayload = {
      test_mode: signwellTestMode(),
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

    tracker.start('signwell_draft');
    let sentDoc;
    try {
      if (document.signwell_document_id) {
        sentDoc = await resumeSignwellDocumentIfDraft(document.signwell_document_id);
      } else {
        sentDoc = await createAndSendSignwellDocument(signwellPayload);
      }
      tracker.complete('signwell_draft');
    } catch (signwellErr: unknown) {
      const raw = signwellErr instanceof Error ? signwellErr.message : String(signwellErr);
      const friendly = friendlySignwellError(raw);
      tracker.fail(document.signwell_document_id ? 'email' : 'signwell_draft', friendly);
      await supabase
        .from('documents')
        .update({
          signwell_dispatch_error: friendly,
          sender_attestation_path: attestationPath,
        })
        .eq('id', documentId)
        .eq('agency_id', agencyId);
      return NextResponse.json(
        { success: false, error: friendly, stages: tracker.snapshot(), supportRef: ref },
        { status: 422 },
      );
    }

    if (!sentDoc?.id) {
      tracker.fail('signwell_draft', 'SignWell did not return a document id');
      return NextResponse.json(
        {
          success: false,
          error: 'SignWell did not return a document id',
          stages: tracker.snapshot(),
          supportRef: ref,
        },
        { status: 502 },
      );
    }

    const testMode = signwellTestMode();
    tracker.start('email');
    const emailCheck = signwellEmailDispatched(sentDoc, testMode);
    if (!emailCheck.ok) {
      tracker.fail('email', emailCheck.reason || 'SignWell email dispatch not confirmed');
      return NextResponse.json(
        {
          success: false,
          error: emailCheck.reason || 'SignWell email dispatch not confirmed',
          stages: tracker.snapshot(),
          supportRef: ref,
        },
        { status: 502 },
      );
    }
    tracker.complete('email');

    tracker.start('confirm');
    const confirmedStatus = sentDoc.status || '';
    if (!signwellDispatchConfirmed(sentDoc)) {
      tracker.fail('confirm', `SignWell status "${confirmedStatus}" — document was not sent (emails not dispatched)`);
      return NextResponse.json(
        {
          success: false,
          error: `SignWell returned status "${confirmedStatus}" — dispatch not confirmed`,
          stages: tracker.snapshot(),
          supportRef: ref,
        },
        { status: 502 },
      );
    }
    tracker.complete('confirm');

    const signingLinks = (sentDoc.signers || [])
      .filter((s) => s.signing_url)
      .map((s) => ({ email: s.email, name: s.name, signing_url: s.signing_url }));

    tracker.start('records');
    const { error: docUpdateErr } = await supabase
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

    if (docUpdateErr) {
      tracker.fail('records', docUpdateErr.message);
      return NextResponse.json(
        {
          success: false,
          error: `Database update failed: ${docUpdateErr.message}`,
          stages: tracker.snapshot(),
          supportRef: ref,
        },
        { status: 500 },
      );
    }

    const { data: verified } = await supabase
      .from('documents')
      .select('signwell_document_id')
      .eq('id', documentId)
      .eq('agency_id', agencyId)
      .single();

    if (!verified?.signwell_document_id) {
      tracker.fail('records', 'signwell_document_id was not persisted');
      return NextResponse.json(
        {
          success: false,
          error: 'Dispatch could not be confirmed in the database',
          stages: tracker.snapshot(),
          supportRef: ref,
        },
        { status: 500 },
      );
    }
    tracker.complete('records');

    const { error: activityErr } = await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      user_id: user.id,
      type: 'document',
      title: 'Document Sent for Signature',
      description: `Document '${document.file_name}' sent to ${externalSigners.length} external signer(s). Agent attestation PDF included.`,
      reference_id: documentId,
      reference_type: 'document',
    });
    if (activityErr) {
      console.warn('activity_logs insert failed:', activityErr.message);
    }

    tracker.start('notification');
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
    tracker.complete('notification');

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
      stages: tracker.snapshot(),
      supportRef: ref,
      signwellTestMode: testMode,
      emailDispatched: emailCheck.ok,
      emailNote: emailCheck.reason,
      recipientEmails: externalSigners.map((s: { email: string }) => s.email),
      message:
        'Agent certification is stored separately. Only external signers receive SignWell requests on the uploaded document.',
    });
  } catch (err: unknown) {
    console.error('Document Dispatch Error Stack:', err);
    const message = err instanceof Error ? err.message : 'Dispatch failed';
    const failed = tracker.failedStage();
    if (!failed) {
      const stageId = tracker.snapshot().find((s) => s.status === 'running')?.id || 'pdf';
      tracker.fail(stageId, friendlySignwellError(message));
    }
    return NextResponse.json(
      {
        success: false,
        error: friendlySignwellError(message),
        stages: tracker.snapshot(),
        supportRef: ref,
      },
      { status: 500 },
    );
  }
}
