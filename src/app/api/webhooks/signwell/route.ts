import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { parseSignwellWebhookPayload, verifyWebhookPayload } from '@/lib/signwell/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { signwellClient } from '@/lib/signwell/client';
import { AgreementRepository } from '@/features/agreements/repositories/agreement.repository';
import { AgreementStatus } from '@/features/agreements/types';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { ApprovalCertificateService } from '@/features/approvals/services/approval-certificate.service';
import {
  logApprovalActivity,
  logApprovalCompleted,
  logCertificateGenerated,
  notifyApprovalUser,
} from '@/features/approvals/lib/activity-log';
import { recordClientSystemNote } from '@/features/file-notes/services/file-notes.service';
import { DocumentAuditService } from '@/lib/audit/document-audit.service';
import { recordComplianceEvent } from '@/lib/compliance/compliance-events.service';
import { recordAgreementSignature } from '@/lib/agreements/agreement-signature-record';
import { markWebhookEventProcessed, recordWebhookEvent } from '@/lib/integrations/webhook-events';

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
    const { data: owner } = await supabase
      .from('users')
      .select('id')
      .eq('agency_id', details.agencyId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();
    if (owner?.id) {
      await supabase.from('activity_logs').insert({
        id: crypto.randomUUID(),
        agency_id: details.agencyId,
        user_id: owner.id,
        type: 'signwell.webhook_failed',
        title: 'SignWell webhook processing failed',
        description: `${details.eventType}: ${details.message}`,
        reference_id: details.documentId || null,
        reference_type: 'signwell',
      });
    }
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
  let webhookEventId: string | null = null;

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

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    webhookEventId = await recordWebhookEvent(supabase, {
      provider: 'signwell',
      eventType,
      externalId: documentId,
      payload: { idempotencyKey },
      payloadHash,
      status: 'received',
      agencyId: null,
    });

    const { error: claimError } = await supabase.from('processed_webhooks').insert({
      webhook_id: idempotencyKey,
      event_type: eventType,
    });
    if (claimError) {
      const duplicate =
        claimError.message.includes('duplicate') ||
        claimError.code === '23505';
      if (duplicate) {
        if (webhookEventId) {
          await markWebhookEventProcessed(supabase, webhookEventId, 'processed');
        }
        return NextResponse.json({ received: true, ignored: 'Duplicate webhook' });
      }
      throw claimError;
    }

    if (!HANDLED_EVENTS.has(eventType)) {
      return NextResponse.json({ received: true, ignored: `Unhandled event: ${eventType}` });
    }

    const { data: agreement } = await supabase
      .from('agreements')
      .select('*')
      .eq('signwell_document_id', documentId)
      .maybeSingle();

    if (!agreement) {
      const { data: approval } = await supabase
        .from('application_approvals')
        .select('*, clients(name, email)')
        .eq('signwell_document_id', documentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (approval) {
        const isFinalSign = eventType === 'document_signed' || eventType === 'document_completed';
        const alreadySigned = Boolean(approval.client_signed_at);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (eventType === 'document_viewed' && !approval.client_viewed_at) {
          updates.client_viewed_at = new Date().toISOString();
        }
        if (isFinalSign && !alreadySigned) {
          const now = new Date().toISOString();
          updates.client_signed_at = now;
          updates.approved_at = approval.approved_at || now;
          updates.status = 'approved';
          updates.signed_by = (approval.clients as { name?: string })?.name || approval.title;
          updates.signature_provider = 'signwell';
          updates.document_version = approval.signwell_document_id || documentId;
        }

        if (isFinalSign) {
          try {
            const pdfBytes = await signwellClient.downloadCompletedPdf(documentId);
            const signedPath = `${approval.agency_id}/approvals/${approval.id}/signed-application.pdf`;
            await supabase.storage
              .from('documents')
              .upload(signedPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
            updates.signed_document_path = signedPath;
          } catch (err) {
            console.error('Failed to preserve signed approval PDF', err);
          }
        }

        if (Object.keys(updates).length > 1) {
          await supabase.from('application_approvals').update(updates).eq('id', approval.id);
        }

        const approvalAudit = new DocumentAuditService(supabase);
        const approvalAuditType =
          eventType === 'document_viewed'
            ? 'viewed'
            : isFinalSign
              ? 'signed'
              : null;
        if (approvalAuditType) {
          await approvalAudit.record({
            agencyId: approval.agency_id,
            clientId: approval.client_id,
            matterId: (approval as { matter_id?: string }).matter_id ?? null,
            documentType: 'application_approval',
            documentId: approval.id,
            eventType: approvalAuditType,
            actorName: (approval.clients as { name?: string })?.name,
            actorEmail: (approval.clients as { email?: string })?.email,
            provider: 'signwell',
            metadata: { signwell_document_id: documentId, event_type: eventType },
          });
        }

        if (isFinalSign && !alreadySigned) {
          await recordComplianceEvent(supabase, {
            agencyId: approval.agency_id,
            clientId: approval.client_id,
            eventType: 'approval_signed',
            fileSource: 'application_approval',
            fileId: approval.id,
            metadata: {
              signwell_document_id: documentId,
              signed_at: updates.client_signed_at,
            },
          });
        }

        const { data: freshApproval } = await supabase
          .from('application_approvals')
          .select('*, clients(name, email)')
          .eq('id', approval.id)
          .single();

        const current = freshApproval || approval;

        if (isFinalSign && !approval.certificate_storage_path && current.client_signed_at) {
          try {
            const { data: agency } = await supabase
              .from('agencies')
              .select('name, slug')
              .eq('id', approval.agency_id)
              .single();
            const certService = new ApprovalCertificateService(supabase);
            const { storagePath, generatedAt } = await certService.generate(
              approval.agency_id,
              current,
              agency?.name || 'Agency',
            );
            await supabase
              .from('application_approvals')
              .update({
                certificate_storage_path: storagePath,
                certificate_generated_at: generatedAt,
              })
              .eq('id', approval.id);
            await logCertificateGenerated(supabase, {
              agency_id: approval.agency_id,
              user_id: approval.created_by,
              approval_id: approval.id,
              approval_number: approval.approval_number,
              title: approval.title,
              agencySlug: agency?.slug,
            });
            await approvalAudit.record({
              agencyId: approval.agency_id,
              clientId: approval.client_id,
              matterId: (approval as { matter_id?: string }).matter_id ?? null,
              documentType: 'certificate',
              documentId: approval.id,
              eventType: 'generated',
              eventTimestamp: generatedAt,
              provider: 'immimate',
              metadata: { storage_path: storagePath },
            });
            if (approval.client_id) {
              await recordClientSystemNote(supabase, {
                agencyId: approval.agency_id,
                clientId: approval.client_id,
                actorUserId: approval.created_by,
                body: `Certificate of Approval generated for ${approval.approval_number || approval.title}.`,
                referenceType: 'application_approval',
                referenceId: approval.id,
              });
            }
          } catch (err) {
            console.error('Approval certificate generation failed', err);
          }
        }

        const { data: agencyMeta } = await supabase
          .from('agencies')
          .select('slug')
          .eq('id', approval.agency_id)
          .single();

        if (isFinalSign && !alreadySigned) {
          await logApprovalActivity(supabase, {
            agency_id: approval.agency_id,
            user_id: approval.created_by,
            type: 'approval.client_signed_signwell',
            title: 'Client signed via SignWell',
            description: approval.approval_number || approval.title,
            approval_id: approval.id,
          });
          await notifyApprovalUser(supabase, {
            agencyId: approval.agency_id,
            agencySlug: agencyMeta?.slug,
            userId: approval.created_by,
            title: 'Client signed application',
            message: `${approval.approval_number || approval.title} was signed via SignWell.`,
            approvalId: approval.id,
            category: 'approval',
          });
          if (approval.client_id) {
            await recordClientSystemNote(supabase, {
              agencyId: approval.agency_id,
              clientId: approval.client_id,
              actorUserId: approval.created_by,
              body: `Application Approval ${approval.approval_number || approval.title} signed by client.`,
              referenceType: 'application_approval',
              referenceId: approval.id,
            });
          }
          await logApprovalCompleted(supabase, {
            agency_id: approval.agency_id,
            user_id: approval.created_by,
            approval_id: approval.id,
            approval_number: approval.approval_number,
            title: approval.title,
            agencySlug: agencyMeta?.slug,
            via: 'signwell',
          });
        }

        return NextResponse.json({ received: true, status: 'processed', entity: 'application_approval' });
      }

      const { data: standaloneDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('signwell_document_id', documentId)
        .maybeSingle();

      if (!standaloneDoc) {
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

      return NextResponse.json({ received: true, status: 'processed', entity: 'document' });
    }

    const agreementRepo = new AgreementRepository(supabase);
    const agreementAlreadySigned = agreement.status === AgreementStatus.SIGNED;
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
        const signedAt = new Date().toISOString();
        agreementUpdate.completed_at = signedAt;
        agreementUpdate.signed_at = signedAt;
        agreementUpdate.signature_provider = 'signwell';
        agreementUpdate.signed_by = agreement.client_name || null;
        agreementUpdate.document_version = agreement.signwell_document_id || documentId;
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

    const auditSvc = new DocumentAuditService(supabase);
    const auditEventType =
      eventType === 'document_viewed'
        ? 'viewed'
        : isFinalSign
          ? 'signed'
          : eventType === 'document_completed'
            ? 'completed'
            : null;
    if (auditEventType) {
      await auditSvc.record({
        agencyId: agreement.agency_id,
        clientId: agreement.client_id,
        matterId: (agreement as { matter_id?: string }).matter_id ?? null,
        documentType: 'service_agreement',
        documentId: agreement.id,
        eventType: auditEventType as 'viewed' | 'signed' | 'completed',
        eventTimestamp: new Date().toISOString(),
        actorName: agreement.client_name,
        actorEmail: agreement.client_email,
        provider: 'signwell',
        metadata: { signwell_document_id: documentId, event_type: eventType },
      });
    }

    if (eventType === 'document_completed') {
      const signerEmail =
        (parsed.event.related_signer?.email as string | undefined)?.trim() ||
        agreement.client_email?.trim() ||
        '';
      if (signerEmail) {
        await recordAgreementSignature(supabase, {
          agreementId: agreement.id,
          signerEmail,
          signedAt: (agreementUpdate.signed_at as string) || new Date().toISOString(),
          ipAddress:
            (parsed.raw as { data?: { object?: { ip_address?: string } } })?.data?.object
              ?.ip_address ?? null,
          provider: 'signwell',
          providerDocumentId: documentId,
          webhookEventId,
          signwellSignerId:
            (parsed.raw as { data?: { object?: { recipients?: Array<{ id?: string }> } } })?.data
              ?.object?.recipients?.[0]?.id ?? null,
        });
      }
    }

    if (isFinalSign && !agreementAlreadySigned) {
      await recordComplianceEvent(supabase, {
        agencyId: agreement.agency_id,
        clientId: agreement.client_id,
        eventType: 'agreement_signed',
        fileSource: 'agreement',
        fileId: agreement.id,
        metadata: {
          signwell_document_id: documentId,
          signed_at: agreementUpdate.signed_at,
        },
      });
    }

    if (isFinalSign && !agreementAlreadySigned) {
      const { data: agencyMeta } = await supabase
        .from('agencies')
        .select('slug')
        .eq('id', agreement.agency_id)
        .single();
      const notify = new NotificationService(supabase);
      const signedTitle =
        eventType === 'document_completed' ? 'Agreement signed' : 'Agreement signature received';
      await notify.notify({
        agencyId: agreement.agency_id,
        userId: agreement.created_by,
        type: 'agreement',
        title: signedTitle,
        message: `${agreement.client_name || agreement.title} ${eventType === 'document_completed' ? 'completed signing' : 'signed'} via SignWell.`,
        actionUrl: buildWorkspaceActionUrl(
          agencyMeta?.slug || 'workspace',
          `/agreements/${agreement.id}`,
        ),
        entityType: 'agreement',
        entityId: agreement.id,
      });

      if (agreement.client_id) {
        await recordClientSystemNote(supabase, {
          agencyId: agreement.agency_id,
          clientId: agreement.client_id,
          actorUserId: agreement.created_by,
          body: `Service Agreement ${agreement.agreement_number || agreement.title} signed by client.`,
          referenceType: 'agreement',
          referenceId: agreement.id,
        });
      }
    }

    if (webhookEventId) {
      await markWebhookEventProcessed(supabase, webhookEventId, 'processed');
      await supabase
        .from('webhook_events')
        .update({ agency_id: agreement.agency_id })
        .eq('id', webhookEventId);
    }
    return NextResponse.json({ received: true, status: 'processed', entity: 'agreement' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('SignWell Webhook Error:', error);
    if (webhookEventId) {
      await markWebhookEventProcessed(supabase, webhookEventId, 'failed', message);
    }
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
