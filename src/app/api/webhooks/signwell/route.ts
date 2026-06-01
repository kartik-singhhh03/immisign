import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/signwell/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { signwellClient } from '@/lib/signwell/client';
import { AgreementRepository } from '@/features/agreements/repositories/agreement.repository';
import { AuditRepository } from '@/features/agreements/repositories/audit.repository';
import { AgreementStatus } from '@/features/agreements/types';
import { AppError } from '@/lib/utils/errors';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signwell-signature');

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id; // Webhook event ID for idempotency
    const eventType = event.event?.type;
    const documentId = event.data?.document?.id;

    if (!eventType || !documentId) {
      return NextResponse.json({ received: true, ignored: 'Missing required fields' });
    }

    const supabase = createAdminClient();

    // 1. Idempotency Check
    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('webhook_id')
      .eq('webhook_id', eventId)
      .single();

    if (existingWebhook) {
      console.log(`Webhook ${eventId} already processed. Ignoring.`);
      return NextResponse.json({ received: true, ignored: 'Duplicate webhook' });
    }

    // 2. Locate Agreement
    const { data: agreement } = await supabase
      .from('agreements')
      .select('*')
      .eq('signwell_document_id', documentId)
      .single();

    if (!agreement) {
      console.error(`No agreement found for SignWell document ${documentId}`);
      return NextResponse.json({ received: true, error: 'Agreement not found' }, { status: 404 });
    }

    const agreementRepo = new AgreementRepository(supabase);
    const auditRepo = new AuditRepository(supabase);

    // 3. Process Webhook Event Type
    let newStatus: AgreementStatus | null = null;
    let auditAction = '';

    if (eventType === 'document_viewed') {
      // Only transition if not already signed/declined
      if (['sent'].includes(agreement.status)) newStatus = AgreementStatus.VIEWED;
      auditAction = 'Document Viewed';
    } else if (eventType === 'document_signed') {
      newStatus = AgreementStatus.SIGNED;
      auditAction = 'Document Signed';
      
      // Download and save completed PDF
      try {
        const pdfBytes = await signwellClient.downloadCompletedPdf(documentId);
        const storagePath = `${agreement.agency_id}/${agreement.id}/signed/completed.pdf`;
        
        await supabase.storage
          .from('secure_documents')
          .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
          
        await supabase.from('documents').insert({
          agency_id: agreement.agency_id,
          agreement_id: agreement.id,
          uploaded_by: agreement.created_by,
          file_name: 'completed.pdf',
          original_name: 'completed.pdf',
          file_url: storagePath,
          file_size: pdfBytes.byteLength,
          mime_type: 'application/pdf',
        });
      } catch (err) {
        console.error('Failed to preserve signed PDF', err);
      }
      
    } else if (eventType === 'document_declined') {
      newStatus = AgreementStatus.REJECTED;
      auditAction = 'Document Declined';
    } else if (eventType === 'document_expired') {
      newStatus = AgreementStatus.EXPIRED;
      auditAction = 'Document Expired';
    } else {
      // Unhandled event
      return NextResponse.json({ received: true, ignored: 'Unhandled event type' });
    }

    // 4. Update Database
    if (newStatus) {
      await agreementRepo.update(agreement.id, { 
        status: newStatus,
        ...(newStatus === AgreementStatus.SIGNED ? { completed_at: new Date().toISOString() } : {})
      });
    }

    if (auditAction) {
      await auditRepo.create({
        agency_id: agreement.agency_id,
        user_id: undefined, // System webhook
        entity_type: 'agreement',
        entity_id: agreement.id,
        action: auditAction,
        metadata: { webhook_id: eventId, event_type: eventType }
      });
    }

    // 5. Mark as processed
    await supabase.from('processed_webhooks').insert({
      webhook_id: eventId,
      event_type: eventType
    });

    return NextResponse.json({ received: true, status: 'processed' });
  } catch (error) {
    console.error('SignWell Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
