import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { parseSignwellWebhookPayload, verifyWebhookPayload } from '@/lib/signwell/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { signwellClient } from '@/lib/signwell/client';
import { AgreementRepository } from '@/features/agreements/repositories/agreement.repository';
import { AgreementStatus } from '@/features/agreements/types';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';

const HANDLED_EVENTS = new Set([
  'document_viewed',
  'document_signed',
  'document_completed',
  'document_declined',
  'document_expired',
  'document_canceled',
  'document_cancelled',
]);

async function logWebhookFailure(
  supabase: ReturnType<typeof createAdminClient>,
  details: {
    idempotencyKey: string;
    eventType: string;
    documentId?: string;
    agencyId?: string;
    message: string;
  },
) {
  console.error('[signwell-webhook]', details);
  if (details.agencyId) {
    await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: details.agencyId,
      user_id: null,
      type: 'signwell.webhook_failed',
      title: 'SignWell webhook processing failed',
      description: `${details.eventType}: ${details.message}`,
      reference_id: details.documentId || null,
      reference_type: 'signwell',
    });
  }
}

async function markProcessed(
  supabase: ReturnType<typeof createAdminClient>,
  idempotencyKey: string,
  eventType: string,
) {
  const { error } = await supabase.from('processed_webhooks').insert({
    webhook_id: idempotencyKey,
    event_type: eventType,
  });
  if (error && !error.message.includes('duplicate')) {
    throw error;
  }
}

async function persistCompletedPdf(
  supabase: ReturnType<typeof createAdminClient>,
  signwellDocumentId: string,
  agreement: { id: string; agency_id: string; created_by: string },
) {
  const pdfBytes = await signwellClient.downloadCompletedPdf(signwellDocumentId);
  const storagePath = `${agreement.agency_id}/${agreement.id}/signed/completed.pdf`;
  await supabase.storage
    .from('secure_documents')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('agreement_id', agreement.id)
    .eq('file_name', 'completed.pdf')
    .maybeSingle();

  if (!existing) {
    await supabase.from('documents').insert({
      agency_id: agreement.agency_id,
      agreement_id: agreement.id,
      uploaded_by: agreement.created_by,
      file_name: 'completed.pdf',
      original_name: 'completed.pdf',
      file_url: storagePath,
      file_size: pdfBytes.byteLength,
      mime_type: 'application/pdf',
      signwell_status: 'completed',
    });
  } else {
    await supabase
      .from('documents')
      .update({ signwell_status: 'completed', file_url: storagePath })
      .eq('id', existing.id);
  }
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  let parsed: ReturnType<typeof parseSignwellWebhookPayload> = null;

  try {
    const rawBody = await req.text();
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const verification = verifyWebhookPayload(body, {
      rawBody,
      signatureHeader: req.headers.get('x-signwell-signature'),
    });
    parsed = verification.parsed;

    if (!verification.ok || !parsed) {
      return NextResponse.json(
        {
          error: 'Unauthorized webhook',
          hint:
            'Set SIGNWELL_WEBHOOK_ID to the hook `id` from GET https://www.signwell.com/api/v1/hooks (matches your Workspace Callback URL). Run: node scripts/list-signwell-hooks.mjs',
        },
        { status: 401 },
      );
    }

    const { eventType, documentId, idempotencyKey } = {
      eventType: parsed.event.type,
      documentId: parsed.documentId,
      idempotencyKey: parsed.idempotencyKey,
    };

    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('webhook_id')
      .eq('webhook_id', idempotencyKey)
      .maybeSingle();

    if (existingWebhook) {
      return NextResponse.json({ received: true, ignored: 'Duplicate webhook' });
    }

    if (!HANDLED_EVENTS.has(eventType)) {
      await markProcessed(supabase, idempotencyKey, `ignored:${eventType}`);
      return NextResponse.json({ received: true, ignored: `Unhandled event: ${eventType}` });
    }

    const { data: agreement } = await supabase
      .from('agreements')
      .select('*')
      .eq('signwell_document_id', documentId)
      .maybeSingle();

    if (!agreement) {
      const { data: standaloneDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('signwell_document_id', documentId)
        .maybeSingle();

      if (!standaloneDoc) {
        await markProcessed(supabase, idempotencyKey, `orphan:${eventType}`);
        return NextResponse.json({ received: true, error: 'Entity not found' }, { status: 404 });
      }

      let signwellStatus = standaloneDoc.signwell_status;
      if (eventType === 'document_signed' || eventType === 'document_completed') {
        signwellStatus = 'completed';
        try {
          const pdfBytes = await signwellClient.downloadCompletedPdf(documentId);
          const storagePath = `${standaloneDoc.agency_id}/documents/${standaloneDoc.id}/completed.pdf`;
          const bucket = standaloneDoc.agreement_id ? 'secure_documents' : 'documents';
          await supabase.storage
            .from(bucket)
            .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
        } catch (err) {
          console.error('Failed to preserve completed standalone document PDF', err);
        }
      } else if (eventType === 'document_viewed') {
        signwellStatus = 'viewed';
      } else if (eventType === 'document_declined') {
        signwellStatus = 'declined';
      } else if (eventType === 'document_expired' || eventType === 'document_canceled' || eventType === 'document_cancelled') {
        signwellStatus = eventType.includes('cancel') ? 'cancelled' : 'expired';
      }

      await supabase
        .from('documents')
        .update({
          signwell_status: signwellStatus,
          ...(signwellStatus === 'completed'
            ? { signwell_completed_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', standaloneDoc.id);

      await supabase.from('activity_logs').insert({
        id: crypto.randomUUID(),
        agency_id: standaloneDoc.agency_id,
        user_id: standaloneDoc.uploaded_by,
        type: 'document',
        title: `SignWell: ${eventType}`,
        description: `Document ${standaloneDoc.file_name} — ${eventType}`,
        reference_id: standaloneDoc.id,
        reference_type: 'document',
      });

      if (eventType === 'document_completed' && standaloneDoc.uploaded_by) {
        const { data: agencyMeta } = await supabase
          .from('agencies')
          .select('slug')
          .eq('id', standaloneDoc.agency_id)
          .single();
        const notify = new NotificationService(supabase);
        await notify.notify({
          agencyId: standaloneDoc.agency_id,
          userId: standaloneDoc.uploaded_by,
          type: 'document',
          title: eventType === 'document_completed' ? 'Document completed' : 'Document signed',
          message: `${standaloneDoc.file_name} — ${eventType} in SignWell.`,
          actionUrl: buildWorkspaceActionUrl(agencyMeta?.slug || 'workspace', '/documents/library'),
          entityType: 'document',
          entityId: standaloneDoc.id,
        });
      }

      await markProcessed(supabase, idempotencyKey, eventType);
      return NextResponse.json({ received: true, status: 'processed', entity: 'document' });
    }

    const agreementRepo = new AgreementRepository(supabase);
    let newStatus: AgreementStatus | null = null;
    let signwellStatus: string | null = null;
    const isFinalSign = eventType === 'document_signed' || eventType === 'document_completed';

    if (eventType === 'document_viewed') {
      if (agreement.status === 'sent') {
        newStatus = AgreementStatus.VIEWED;
        signwellStatus = 'viewed';
      }
    } else if (isFinalSign) {
      newStatus = AgreementStatus.SIGNED;
      signwellStatus = 'completed';
      try {
        await persistCompletedPdf(supabase, documentId, agreement);
      } catch (err) {
        console.error('Failed to preserve signed agreement PDF', err);
      }
    } else if (eventType === 'document_declined') {
      newStatus = AgreementStatus.REJECTED;
      signwellStatus = 'declined';
    } else if (eventType === 'document_expired') {
      newStatus = AgreementStatus.EXPIRED;
      signwellStatus = 'expired';
    } else if (eventType === 'document_canceled' || eventType === 'document_cancelled') {
      newStatus = AgreementStatus.CANCELLED;
      signwellStatus = 'cancelled';
    }

    const agreementUpdate: Record<string, unknown> = {};
    if (newStatus) {
      agreementUpdate.status = newStatus;
      if (newStatus === AgreementStatus.SIGNED) {
        agreementUpdate.completed_at = new Date().toISOString();
      }
    }
    if (signwellStatus) {
      agreementUpdate.signwell_status = signwellStatus;
    }
    if (Object.keys(agreementUpdate).length) {
      await agreementRepo.update(agreement.id, agreementUpdate);
    }

    if (isFinalSign) {
      try {
        const meta = agreement.metadata as { wizard_form?: unknown } | null;
        if (meta?.wizard_form) {
          const docGen = new DocumentGenerationService(supabase);
          await docGen.regenerateAgreementPdf(
            agreement.agency_id,
            agreement.created_by,
            agreement.id,
          );
        }
      } catch (err) {
        console.error('Failed to regenerate agreement PDF with executed status', err);
      }
    }

    await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: agreement.agency_id,
      user_id: agreement.created_by,
      type: 'agreement',
      title: `SignWell: ${eventType}`,
      description: `Agreement ${agreement.agreement_number || agreement.title} — ${eventType}`,
      reference_id: agreement.id,
      reference_type: 'agreement',
    });

    if (eventType === 'document_completed') {
      const { data: agencyMeta } = await supabase
        .from('agencies')
        .select('slug')
        .eq('id', agreement.agency_id)
        .single();
      const notify = new NotificationService(supabase);
      await notify.notify({
        agencyId: agreement.agency_id,
        userId: agreement.created_by,
        type: 'agreement',
        title: 'Agreement signed',
        message: `${agreement.client_name || agreement.title} completed signing via SignWell.`,
        actionUrl: buildWorkspaceActionUrl(
          agencyMeta?.slug || 'workspace',
          `/agreements/${agreement.id}`,
        ),
        entityType: 'agreement',
        entityId: agreement.id,
      });
    }

    await markProcessed(supabase, idempotencyKey, eventType);
    return NextResponse.json({ received: true, status: 'processed', entity: 'agreement' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('SignWell Webhook Error:', error);
    if (parsed) {
      try {
        await logWebhookFailure(createAdminClient(), {
          idempotencyKey: parsed.idempotencyKey,
          eventType: parsed.event.type,
          documentId: parsed.documentId,
          message,
        });
      } catch {
        /* ignore secondary failure */
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
