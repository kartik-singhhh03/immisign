import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConflictError, GoneError, NotFoundError } from '@/lib/utils/errors';
import { sendEmailWithForensicLogging, formatBrandedSender } from '@/lib/email/resend';
import {
  buildAgreementSigningEmailHtml,
  buildAgreementSigningEmailText,
} from '@/lib/email/transactional';
import { buildAgreementSignUrl, assertSafeEmailUrl } from '@/lib/app-url';
import { APP_NAME } from '@/lib/brand';
import { formatSydneyDateTime } from '@/lib/datetime/sydney';
import { recordClientSystemNote } from '@/features/file-notes/services/file-notes.service';
import {
  AGREEMENT_EMAIL_PROVIDER,
  AGREEMENT_NATIVE_PORTAL_PROVIDER,
  recordAgreementSigningAudit,
} from '../lib/agreement-signing-audit';
import { verifyClientLegalName } from '../lib/name-verification';
import { DocumentGenerationService } from './document-generation.service';
import { AgentSignatureService } from './agent-signature.service';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus } from '../types';
import {
  AgreementSigningRecordService,
  buildAgreementSignedFileNoteBody,
  buildAgentAgreementSignedNotificationHtml,
  buildClientAgreementSignedNotificationHtml,
} from './agreement-signing-record.service';

export type NativeAgreementRow = {
  id: string;
  agency_id: string;
  client_id: string | null;
  matter_id: string | null;
  created_by: string;
  title: string | null;
  agreement_number: string | null;
  client_name: string | null;
  client_email: string | null;
  status: string;
  signing_token: string | null;
  token_expires_at: string | null;
  signing_provider: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  signed_at: string | null;
  completed_at: string | null;
  client_ip: string | null;
  client_user_agent: string | null;
  client_name_confirmed: string | null;
  pdf_hash: string | null;
  signature_hash: string | null;
  signed_pdf_hash: string | null;
  signing_record_hash: string | null;
  audit_hash: string | null;
  signed_pdf_storage_path: string | null;
  signing_record_storage_path: string | null;
  client_signature_storage_path: string | null;
  metadata: Record<string, unknown> | null;
};

const TOKEN_TTL_DAYS = 90;
const AGREEMENT_ALREADY_SIGNED = 'This agreement has already been signed.';

export class NativeAgreementSigningService {
  constructor(_supabase?: SupabaseClient) {}

  private admin() {
    return createAdminClient();
  }

  auditContext(row: NativeAgreementRow) {
    return {
      id: row.id,
      agency_id: row.agency_id,
      client_id: row.client_id,
      matter_id: row.matter_id,
      title: row.title,
      agreement_number: row.agreement_number,
    };
  }

  isExpired(row: NativeAgreementRow): boolean {
    if (!row.token_expires_at) return false;
    return new Date(row.token_expires_at).getTime() < Date.now();
  }

  isCompleted(row: NativeAgreementRow): boolean {
    return row.status === 'signed' || row.status === 'completed';
  }

  async getByToken(token: string): Promise<NativeAgreementRow | null> {
    const { data } = await this.admin()
      .from('agreements')
      .select('*')
      .eq('signing_token', token)
      .eq('signing_provider', 'native')
      .is('deleted_at', null)
      .maybeSingle();
    return (data as NativeAgreementRow) || null;
  }

  async getSignedDownloadUrl(agreement: NativeAgreementRow): Promise<string> {
    const admin = this.admin();
    const path =
      agreement.signed_pdf_storage_path ||
      (await admin
        .from('documents')
        .select('file_url')
        .eq('agreement_id', agreement.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()).data?.file_url;

    if (!path) throw new Error('Agreement PDF not found');

    const { data, error } = await admin.storage.from('secure_documents').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
    return data.signedUrl;
  }

  async sendForSignature(params: {
    supabase: SupabaseClient;
    agencyId: string;
    userId: string;
    agreementId: string;
    dispatchOptions?: Record<string, unknown>;
  }) {
    const { supabase, agencyId, userId, agreementId, dispatchOptions } = params;
    const { data: agreement, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('id', agreementId)
      .eq('agency_id', agencyId)
      .single();

    if (error || !agreement) throw new Error('Agreement not found');

    AgreementStateMachine.validateTransition(agreement.status as AgreementStatus, AgreementStatus.SENT);

    const agentSig = new AgentSignatureService(supabase);
    await agentSig.applyAgentSignatureOnSend(agencyId, userId, agreementId);

    const { data: doc } = await supabase
      .from('documents')
      .select('file_url')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let pdfHash: string | null = null;
    if (doc?.file_url) {
      const { data: signed } = await supabase.storage.from('secure_documents').createSignedUrl(doc.file_url, 300);
      if (signed?.signedUrl) {
        const buf = Buffer.from(await (await fetch(signed.signedUrl)).arrayBuffer());
        pdfHash = createHash('sha256').update(buf).digest('hex');
      }
    }

    const signingToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();
    const sentAt = new Date().toISOString();

    await supabase
      .from('agreements')
      .update({
        status: 'sent',
        signing_provider: 'native',
        signing_token: signingToken,
        token_expires_at: tokenExpiresAt,
        sent_at: sentAt,
        pdf_hash: pdfHash,
        signature_provider: 'native',
        updated_at: sentAt,
      })
      .eq('id', agreementId);

    const auditCtx = this.auditContext(agreement as NativeAgreementRow);
    await recordAgreementSigningAudit(supabase, auditCtx, 'sent', {
      eventTimestamp: sentAt,
      provider: AGREEMENT_EMAIL_PROVIDER,
      metadata: { action: 'agreement_sent', pdf_hash: pdfHash },
    });

    const portalUrl = buildAgreementSignUrl(signingToken);
    assertSafeEmailUrl(portalUrl, 'agreement signing link');
    const clientEmail = agreement.client_email;
    if (clientEmail) {
      const [{ data: agency }, { data: agent }] = await Promise.all([
        supabase.from('agencies').select('name').eq('id', agencyId).single(),
        supabase.from('users').select('full_name, email').eq('id', userId).single(),
      ]);

      const agencyName = agency?.name || APP_NAME;
      const agentName = agent?.full_name || 'Your migration agent';
      const agreementTitle =
        agreement.title || agreement.agreement_number || 'Service Agreement';
      const customMessage = (dispatchOptions?.emailMessage as string | undefined)?.trim();
      const expiresLabel = new Date(tokenExpiresAt).toLocaleDateString('en-AU', {
        dateStyle: 'long',
      });

      const html = buildAgreementSigningEmailHtml({
        agencyName,
        clientName: agreement.client_name || 'Client',
        agreementTitle,
        agentName,
        messageBody: customMessage,
        signUrl: portalUrl,
        expiresAt: expiresLabel,
      });

      const text = buildAgreementSigningEmailText({
        agencyName,
        clientName: agreement.client_name || 'Client',
        agreementTitle,
        agentName,
        messageBody: customMessage,
        signUrl: portalUrl,
      });

      const emailResult = await sendEmailWithForensicLogging(
        {
          from: formatBrandedSender(agentName, agencyName),
          replyTo: agent?.email || undefined,
          to: clientEmail,
          subject:
            (dispatchOptions?.emailSubject as string) ||
            `Service Agreement — ${agencyName}`,
          html,
          text,
        },
        { emailType: 'agreement_native_send', agencyId },
      );

      const resendId = (emailResult as { data?: { id?: string } })?.data?.id ?? null;
      await recordAgreementSigningAudit(supabase, auditCtx, 'completed', {
        eventTimestamp: sentAt,
        provider: AGREEMENT_EMAIL_PROVIDER,
        metadata: {
          action: 'agreement_sent_email',
          resend_id: resendId,
          recipient: clientEmail,
          portal_url: portalUrl,
        },
      });
    }

    return { signingToken, signingUrl: portalUrl, pdfHash };
  }

  async markViewed(token: string, ip?: string, userAgent?: string) {
    const admin = this.admin();
    const agreement = await this.getByToken(token);
    if (!agreement) throw new NotFoundError('Link not found');
    if (this.isExpired(agreement)) throw new GoneError('Link expired');
    if (this.isCompleted(agreement)) return agreement;

    if (agreement.status === 'sent') {
      const now = new Date().toISOString();
      await admin
        .from('agreements')
        .update({
          status: 'viewed',
          viewed_at: now,
          updated_at: now,
        })
        .eq('id', agreement.id);

      await recordAgreementSigningAudit(admin, this.auditContext(agreement), 'viewed', {
        eventTimestamp: now,
        ipAddress: ip || null,
        provider: AGREEMENT_NATIVE_PORTAL_PROVIDER,
        metadata: { action: 'agreement_viewed', user_agent: userAgent || null },
      });
    } else if (agreement.status === 'viewed' && !agreement.viewed_at) {
      const now = new Date().toISOString();
      await admin
        .from('agreements')
        .update({ viewed_at: now, updated_at: now })
        .eq('id', agreement.id);
    }

    return this.getByToken(token);
  }

  async logDownload(token: string, ip?: string, userAgent?: string) {
    const admin = this.admin();
    const agreement = await this.getByToken(token);
    if (!agreement) return;

    const now = new Date().toISOString();
    await admin
      .from('agreements')
      .update({
        downloaded_at: agreement.downloaded_at || now,
        updated_at: now,
      })
      .eq('id', agreement.id);

    await recordAgreementSigningAudit(admin, this.auditContext(agreement), 'completed', {
      eventTimestamp: now,
      ipAddress: ip || null,
      provider: AGREEMENT_NATIVE_PORTAL_PROVIDER,
      metadata: { action: 'agreement_downloaded', user_agent: userAgent || null },
    });
  }

  async signByToken(params: {
    token: string;
    clientName: string;
    signaturePngBase64: string;
    declarations: Record<string, boolean>;
    ip?: string;
    userAgent?: string;
  }) {
    const admin = this.admin();
    const agreement = await this.getByToken(params.token);
    if (!agreement) throw new NotFoundError('Link not found');
    if (this.isExpired(agreement)) throw new GoneError('Link expired');
    if (this.isCompleted(agreement)) throw new ConflictError(AGREEMENT_ALREADY_SIGNED);

    const wizardForm = (agreement.metadata?.wizard_form || {}) as Record<string, string>;
    const nameOk = verifyClientLegalName(params.clientName, {
      first: wizardForm.clientFirstName,
      middle: wizardForm.clientMiddleName,
      last: wizardForm.clientLastName,
      fallback: agreement.client_name || wizardForm.clientName,
    });
    if (!nameOk) {
      throw new Error('Typed name does not match the client identity on this agreement.');
    }

    const requiredDecls = ['readAgreement', 'understandFees', 'authoriseAgent', 'understandRefund'];
    for (const key of requiredDecls) {
      if (!params.declarations[key]) {
        throw new Error('All declarations must be accepted before signing.');
      }
    }

    const pngBuffer = Buffer.from(
      params.signaturePngBase64.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );
    if (pngBuffer.length < 100) throw new Error('Invalid signature image');

    const signatureHash = createHash('sha256').update(pngBuffer).digest('hex');
    const sigPath = `${agreement.agency_id}/agreements/${agreement.id}/client-signature.png`;

    const { error: sigUploadErr } = await admin.storage.from('secure_documents').upload(sigPath, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    });
    if (sigUploadErr) throw new Error(`Signature upload failed: ${sigUploadErr.message}`);

    const now = new Date().toISOString();
    const signatureDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    await admin
      .from('agreements')
      .update({
        client_signature_storage_path: sigPath,
        signature_hash: signatureHash,
        status: 'signed',
        signed_at: now,
        client_name_confirmed: params.clientName.trim(),
        client_ip: params.ip || null,
        client_user_agent: params.userAgent || null,
        metadata: {
          ...(agreement.metadata || {}),
          native_client_signature_data_url: signatureDataUrl,
          declarations_accepted: params.declarations,
        },
        updated_at: now,
      })
      .eq('id', agreement.id);

    await recordAgreementSigningAudit(admin, this.auditContext(agreement), 'signed', {
      eventTimestamp: now,
      actorName: params.clientName.trim(),
      ipAddress: params.ip || null,
      metadata: {
        action: 'agreement_signed',
        user_agent: params.userAgent || null,
        signature_hash: signatureHash,
        client_signature_storage_path: sigPath,
      },
    });

    await this.finalizeNativeSign({
      agreement,
      token: params.token,
      clientName: params.clientName.trim(),
      signatureDataUrl,
      ip: params.ip,
      userAgent: params.userAgent,
      signedAt: now,
    });

    const updated = await this.getByToken(params.token);
    return { agreement: updated! };
  }

  private async syncDocumentPdfPath(
    admin: ReturnType<typeof createAdminClient>,
    agreementId: string,
    agencyId: string,
    storagePath: string,
    fileSize: number,
    uploadedBy: string,
  ) {
    const fileName = storagePath.split('/').pop() || 'signed-agreement.pdf';
    const now = new Date().toISOString();
    const { data: existingDoc } = await admin
      .from('documents')
      .select('id')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDoc?.id) {
      await admin
        .from('documents')
        .update({
          file_url: storagePath,
          file_size: fileSize,
          updated_at: now,
        })
        .eq('id', existingDoc.id);
      return;
    }

    await admin.from('documents').insert({
      agency_id: agencyId,
      agreement_id: agreementId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      original_name: fileName,
      file_url: storagePath,
      file_size: fileSize,
      mime_type: 'application/pdf',
    });
  }

  private async finalizeNativeSign(params: {
    agreement: {
      id: string;
      agency_id: string;
      created_by: string;
      client_id: string | null;
      matter_id: string | null;
      metadata?: Record<string, unknown> | null;
    };
    token: string;
    clientName: string;
    signatureDataUrl: string;
    ip?: string;
    userAgent?: string;
    signedAt: string;
  }) {
    const admin = this.admin();
    try {
      const gen = new DocumentGenerationService(admin);
      const { storagePath: signedPdfPath, size: signedSize } = await gen.regenerateSignedNativePdf(
        params.agreement.agency_id,
        params.agreement.created_by,
        params.agreement.id,
        params.signatureDataUrl,
      );

      await admin
        .from('agreements')
        .update({
          signed_pdf_storage_path: signedPdfPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.agreement.id);

      await this.syncDocumentPdfPath(
        admin,
        params.agreement.id,
        params.agreement.agency_id,
        signedPdfPath,
        signedSize,
        params.agreement.created_by,
      );

      const completedAt = new Date().toISOString();
      await admin
        .from('agreements')
        .update({ status: 'completed', completed_at: completedAt, updated_at: completedAt })
        .eq('id', params.agreement.id);

      await recordAgreementSigningAudit(
        admin,
        this.auditContext(params.agreement as NativeAgreementRow),
        'acknowledged',
        {
        eventTimestamp: completedAt,
        actorName: params.clientName,
        ipAddress: params.ip || null,
        metadata: {
          action: 'agreement_completed',
          user_agent: params.userAgent || null,
          declarations_confirmed: true,
          signed_pdf_storage_path: signedPdfPath,
        },
      });

      await this.runPostSignEnhancements(
        admin,
        params.agreement.id,
        params.token,
        params.clientName,
        params.ip,
      );
    } catch (err) {
      console.error('NATIVE_SIGN_FINALIZE_FAILED', err);
      throw err;
    }
  }

  private async computeAuditHash(admin: ReturnType<typeof createAdminClient>, agreementId: string) {
    const { data: events, error } = await admin
      .from('document_audit_events')
      .select('id, event_type, event_timestamp, metadata')
      .eq('document_id', agreementId)
      .eq('document_type', 'service_agreement')
      .order('event_timestamp', { ascending: true });
    if (error) throw new Error(`Audit events query failed: ${error.message}`);
    const canonical = JSON.stringify(
      (events || []).map((e) => ({
        id: e.id,
        event_type: e.event_type,
        event_timestamp: e.event_timestamp,
        metadata: e.metadata,
      })),
    );
    return createHash('sha256').update(canonical).digest('hex');
  }

  private async loadSignedPdfBuffer(
    admin: ReturnType<typeof createAdminClient>,
    storagePath: string | null,
  ): Promise<Buffer | null> {
    if (!storagePath) return null;
    const { data, error } = await admin.storage.from('secure_documents').download(storagePath);
    if (error || !data) {
      console.error('SIGNED_PDF_DOWNLOAD_FAILED', error?.message || storagePath);
      return null;
    }
    return Buffer.from(await data.arrayBuffer());
  }

  private async runPostSignEnhancements(
    admin: ReturnType<typeof createAdminClient>,
    agreementId: string,
    token: string,
    clientName: string,
    ip?: string,
  ) {
    let fresh = await this.getByToken(token);
    if (!fresh || fresh.status !== 'completed') return;

    const [{ data: agency }, { data: agent }, { data: client }] = await Promise.all([
      admin.from('agencies').select('name').eq('id', fresh.agency_id).single(),
      admin.from('users').select('full_name, email').eq('id', fresh.created_by).single(),
      admin.from('clients').select('name, email').eq('id', fresh.client_id!).maybeSingle(),
    ]);

    const recordSvc = new AgreementSigningRecordService(admin);
    const recordCtx = {
      agencyName: agency?.name || APP_NAME,
      agentName: agent?.full_name || 'Agent',
      agentEmail: agent?.email || '',
      clientName: client?.name || clientName,
      clientEmail: client?.email || fresh.client_email || '',
      token,
      declarations: (fresh.metadata?.declarations_accepted as Record<string, boolean>) || {},
    };

    const signedPdfBuf = await this.loadSignedPdfBuffer(admin, fresh.signed_pdf_storage_path);
    if (signedPdfBuf) {
      const signedPdfHash = createHash('sha256').update(signedPdfBuf).digest('hex');
      await admin.from('agreements').update({ signed_pdf_hash: signedPdfHash }).eq('id', agreementId);
      fresh = { ...fresh, signed_pdf_hash: signedPdfHash };
    }

    const auditHash = await this.computeAuditHash(admin, agreementId);
    await admin.from('agreements').update({ audit_hash: auditHash }).eq('id', agreementId);
    fresh = { ...fresh, audit_hash: auditHash };

    const pass1 = await recordSvc.generate(fresh.agency_id, fresh.created_by, fresh, recordCtx);
    const signingRecordHash = createHash('sha256').update(pass1.pdfBuffer).digest('hex');
    fresh = { ...fresh, signing_record_hash: signingRecordHash };

    const recordResult = await recordSvc.generate(fresh.agency_id, fresh.created_by, fresh, recordCtx);
    const { storagePath: recordPath, pdfBuffer: recordBuf, generatedAt } = recordResult;

    await admin
      .from('agreements')
      .update({
        signing_record_storage_path: recordPath,
        signing_record_hash: signingRecordHash,
      })
      .eq('id', agreementId);
    fresh = { ...fresh, signing_record_storage_path: recordPath };

    await recordAgreementSigningAudit(admin, this.auditContext(fresh), 'generated', {
      eventTimestamp: generatedAt,
      provider: AGREEMENT_NATIVE_PORTAL_PROVIDER,
      metadata: {
        action: 'agreement_record_generated',
        signing_record_storage_path: recordPath,
        signing_record_hash: signingRecordHash,
        audit_hash: auditHash,
      },
    });

    const signedAtLabel = formatSydneyDateTime(fresh.signed_at || new Date().toISOString());
    const signedAttachment = signedPdfBuf
      ? [{ filename: 'signed-agreement.pdf', content: signedPdfBuf }]
      : undefined;

    const clientEmail = client?.email || fresh.client_email;
    if (!clientEmail) {
      console.error('AGREEMENT_CLIENT_NOTIFY_SKIPPED', 'No client email on agreement', agreementId);
    }
    if (!agent?.email) {
      console.error('AGREEMENT_AGENT_NOTIFY_SKIPPED', 'No agent email', agreementId);
    }
    await Promise.all([
      clientEmail
        ? sendEmailWithForensicLogging(
            {
              from: formatBrandedSender(agent?.full_name || 'Agent', agency?.name || APP_NAME),
              to: clientEmail,
              subject: 'Agreement Successfully Signed',
              html: buildClientAgreementSignedNotificationHtml({
                clientName: client?.name || clientName,
                agreementRef: fresh.agreement_number || '—',
                signedAt: signedAtLabel,
              }),
              attachments: signedAttachment,
            },
            { emailType: 'agreement_native_client_signed', agencyId: fresh.agency_id },
          )
            .then(async (clientEmailResult) => {
              const resendId = (clientEmailResult as { data?: { id?: string } })?.data?.id ?? null;
              await recordAgreementSigningAudit(admin, this.auditContext(fresh), 'completed', {
                eventTimestamp: new Date().toISOString(),
                provider: AGREEMENT_EMAIL_PROVIDER,
                metadata: { action: 'client_notified', resend_id: resendId, recipient: clientEmail },
              });
            })
            .catch((err) => {
              console.error('AGREEMENT_CLIENT_NOTIFY_FAILED', err);
              throw err;
            })
        : Promise.resolve(),
      agent?.email
        ? sendEmailWithForensicLogging(
            {
              from: formatBrandedSender(APP_NAME, agency?.name || APP_NAME),
              to: agent.email,
              subject: `Agreement Signed By Client — ${fresh.agreement_number || fresh.client_name}`,
              html: buildAgentAgreementSignedNotificationHtml({
                clientName: client?.name || clientName,
                agreementRef: fresh.agreement_number || '—',
                signedAt: signedAtLabel,
                confirmedName: fresh.client_name_confirmed || clientName,
                clientIp: fresh.client_ip || ip || null,
              }),
              attachments: [
                ...(signedAttachment || []),
                { filename: 'agreement-signing-record.pdf', content: recordBuf },
              ],
            },
            { emailType: 'agreement_native_agent_notify', agencyId: fresh.agency_id },
          )
            .then(async (agentEmailResult) => {
              const resendId = (agentEmailResult as { data?: { id?: string } })?.data?.id ?? null;
              await recordAgreementSigningAudit(admin, this.auditContext(fresh), 'completed', {
                eventTimestamp: new Date().toISOString(),
                provider: AGREEMENT_EMAIL_PROVIDER,
                metadata: { action: 'agent_notified', resend_id: resendId, recipient: agent.email },
              });
            })
            .catch((err) => {
              console.error('AGREEMENT_AGENT_NOTIFY_FAILED', err);
              throw err;
            })
        : Promise.resolve(),
    ]);

    const { data: existingNote } = await admin
      .from('file_notes')
      .select('id')
      .eq('agency_id', fresh.agency_id)
      .eq('reference_type', 'agreement')
      .eq('reference_id', fresh.id)
      .eq('is_system_note', true)
      .ilike('body', '%Agreement Signed%')
      .limit(1)
      .maybeSingle();

    if (!existingNote && fresh.client_id) {
      await recordClientSystemNote(admin, {
        agencyId: fresh.agency_id,
        clientId: fresh.client_id,
        actorUserId: fresh.created_by,
        fileSource: 'agreement',
        fileId: fresh.id,
        referenceType: 'agreement',
        referenceId: fresh.id,
        noteType: 'system',
        recordedAt: fresh.signed_at || generatedAt,
        body: buildAgreementSignedFileNoteBody({
          clientName: client?.name || clientName,
          agreementRef: fresh.agreement_number || fresh.id,
          signedAt: fresh.signed_at || generatedAt,
          confirmedName: fresh.client_name_confirmed || clientName,
          clientIp: fresh.client_ip,
          token,
          signingRecordPath: recordPath,
        }),
        metadata: {
          title: 'Agreement Signed',
          type: 'Compliance',
          category: 'Service Agreement',
          agreement_id: fresh.id,
        },
      });

      await recordAgreementSigningAudit(admin, this.auditContext(fresh), 'completed', {
        eventTimestamp: generatedAt,
        metadata: { action: 'file_note_created' },
      });
    } else if (!fresh.client_id) {
      console.error('AGREEMENT_FILE_NOTE_SKIPPED', 'Agreement has no client_id', agreementId);
    }
  }
}
