// @ts-nocheck
// @ts-nocheck
import { signwellClient } from './client';
import { createAdminClient } from '../supabase/admin';
import { createClient } from '../supabase/server';
import { AppError } from '../utils/errors';
import { getCurrentAgency, getCurrentUser } from '../supabase/auth';
import { logAuditAction } from '../services/audit.service';
import { getSignedDownloadUrl } from '../services/storage.service';

export async function createAndSendAgreementPackage(agreementId: string) {
  const agency = await getCurrentAgency();
  const user = await getCurrentUser();
  const supabase = await createClient();

  if (!agency || !user) throw new AppError('Unauthorized', 'UNAUTHORIZED');

  // 1. Fetch Agreement Data (Verify Ownership)
  const { data: agreement, error: agErr } = await supabase
    .from('agreements')
    .select('*, documents(*), signers(*)')
    .eq('id', agreementId)
    .eq('agency_id', agency.id)
    .single();

  if (agErr || !agreement) throw new AppError('Agreement not found', 'NOT_FOUND');
  
  if (agreement.status !== 'draft') {
      throw new AppError('Agreement is not in draft state', 'VALIDATION_ERROR');
  }

  if (agreement.signwell_document_id) {
      console.warn('[SIGNWELL_DISPATCH] Draft agreement already has signwell_document_id. A fresh draft will be created.', {
        agreementId,
        existingDocumentId: agreement.signwell_document_id,
      });
  }

  // 2. Prepare payload
  const filesPayload = await Promise.all(
    agreement.documents.map(async (doc: any) => {
        // Here we could fetch the Base64 via a secure admin download if needed.
        // For efficiency, sending standard public signed URLs 
        const url = await getSignedDownloadUrl(doc.storage_path, 'documents');
        return {
           name: doc.file_name,
           file_url: url
        };
    })
  );

  const signersPayload = agreement.signers.map((s: any) => ({
      id: s.id, // Our DB internal UUID -> Maps exactly strictly
      name: s.full_name,
      email: s.email,
      routing_order: s.signing_order,
  }));

  // 3. Create Document via SignWell Service
  const signwellData = await signwellClient.createDocument({
      test_mode: process.env.NODE_ENV !== 'production',
      name: agreement.title,
      files: filesPayload,
      signers: signersPayload,
      apply_signing_order: true,
      reminders: true,
      expires_in: 30, // Default 30 days
      draft: true,
  });

  // 4. Send Document immediately (SignWell creates in a Draft state unless sent)
  console.log('[SIGNWELL_SEND_START]', JSON.stringify({ agreementId, signwellDocumentId: signwellData.id }));
  await signwellClient.sendDocument(signwellData.id);
  console.log('[SIGNWELL_SEND_SUCCESS]', JSON.stringify({ agreementId, signwellDocumentId: signwellData.id }));

  // 5. Build transaction object and commit statuses to Database
  const adminClient = createAdminClient();
  
  // Note: doing this via admin prevents RLS issues on back-office tasks
  await adminClient.from('agreements').update({
       signwell_document_id: signwellData.id,
       signwell_status: signwellData.status,
       status: 'sent',
       signwell_sent_at: new Date().toISOString(),
  }).eq('id', agreementId);

  // Sync back uniquely generated signer urls (if applicable)
  for (const swSigner of signwellData.signers) {
      await adminClient.from('signers').update({
          signwell_signer_id: swSigner.id,
          signing_url: swSigner.signing_url,
      }).eq('id', swSigner.id).eq('agreement_id', agreementId);
  }

  // 6. Log Audit
  await logAuditAction('signature_requested', 'agreement', agreementId, { 
      signwell_document_id: signwellData.id 
  });

  return signwellData;
}

export async function archiveCompletedSignWellPdf(agreementId: string, signwellDocId: string, agencyId: string) {
    const admin = createAdminClient();
    
    // Download bytes natively via server backchannel
    const pdfBytes = await signwellClient.downloadCompletedPdf(signwellDocId);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const storagePath = `${agencyId}/${agreementId}/signed/completed.pdf`;

    // Upload to our secure tenant buckets
    const { error: uploadError } = await admin.storage
        .from('agreements')
        .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
        console.error('Failed to securely archive completed PDF:', uploadError);
        throw new AppError('Failed archiving file', 'INTERNAL_ERROR');
    }

    return storagePath;
}

