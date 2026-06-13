import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { assertSafeEmailUrl, buildApprovalUrl } from '@/lib/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendFromEmail, sendEmailWithForensicLogging } from '@/lib/email/resend';
import {
  APPROVAL_ALREADY_COMPLETED_MESSAGE,
  ConflictError,
  GoneError,
  NotFoundError,
} from '@/lib/utils/errors';
import { logApprovalActivity, notifyApprovalUser } from '../lib/activity-log';
import {
  DEFAULT_MESSAGE_BODY,
  TOKEN_TTL_DAYS,
  defaultMessageSubject,
  type ApplicationApprovalRecord,
  type ApplicationApprovalStatus,
} from '../types/rebuild';

const BUCKET = 'application-approvals';

export class ApplicationApprovalRebuildService {
  constructor(private supabase: SupabaseClient) {}

  async createDraft(params: {
    agencyId: string;
    userId: string;
    clientId: string;
    matterId: string | null;
    matterReference: string;
    visaSubclass: string;
    visaStream?: string | null;
    fileSource?: string;
    fileId?: string;
  }): Promise<ApplicationApprovalRecord> {
    const { data: client } = await this.supabase
      .from('clients')
      .select('name, email')
      .eq('id', params.clientId)
      .eq('agency_id', params.agencyId)
      .single();
    if (!client) throw new Error('Client not found');

    const { data: agent } = await this.supabase
      .from('users')
      .select('full_name')
      .eq('id', params.userId)
      .single();

    let matterId = params.matterId;
    if (!matterId && params.fileId && params.fileSource === 'agreement') {
      matterId = await this.resolveMatterFromAgreement(params.agencyId, params.clientId, params.fileId);
    }
    if (!matterId && params.fileId && params.fileSource === 'application_approval') {
      matterId = await this.resolveMatterFromApproval(params.agencyId, params.fileId);
    }
    if (!matterId) {
      const agreementId =
        params.fileSource === 'agreement' && params.fileId ? params.fileId : undefined;
      matterId = await this.ensureMatter(params.agencyId, params.clientId, agreementId);
    }

    const { data, error } = await this.supabase
      .from('application_approvals')
      .insert({
        agency_id: params.agencyId,
        client_id: params.clientId,
        matter_id: matterId,
        created_by: params.userId,
        status: 'draft',
        title: `Application Approval — ${params.matterReference}`,
        matter_reference: params.matterReference,
        visa_subclass: params.visaSubclass,
        visa_stream: params.visaStream || null,
        message_subject: defaultMessageSubject(params.matterReference),
        message_body: DEFAULT_MESSAGE_BODY(client.name, agent?.full_name || 'Your migration agent'),
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create approval draft');

    await this.logEvent({
      agencyId: params.agencyId,
      approvalId: data.id,
      matterId,
      clientId: params.clientId,
      eventType: 'approval_created',
      description: 'Application approval created',
      actorId: params.userId,
    });

    return data as ApplicationApprovalRecord;
  }

  async updateDraft(
    agencyId: string,
    approvalId: string,
    patch: Partial<{
      message_subject: string;
      message_body: string;
      application_file_path: string | null;
      application_file_name: string | null;
      application_file_size: number | null;
    }>,
  ) {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', approvalId)
      .eq('agency_id', agencyId)
      .eq('status', 'draft')
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to update draft');
    return data as ApplicationApprovalRecord;
  }

  async sendForClientApproval(params: {
    agencyId: string;
    agencySlug: string;
    userId: string;
    approvalId: string;
    appUrl?: string;
  }) {
    const approval = await this.getById(params.agencyId, params.approvalId);
    if (!approval) throw new Error('Approval not found');
    if (approval.status !== 'draft') throw new Error('Only draft approvals can be sent');
    if (!approval.application_file_path) throw new Error('Upload the application PDF first');

    const { data: client } = await this.supabase
      .from('clients')
      .select('name, email')
      .eq('id', approval.client_id)
      .single();
    if (!client?.email) throw new Error('Client email not found');

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);
    const now = new Date().toISOString();

    const { data: updated, error } = await this.supabase
      .from('application_approvals')
      .update({
        approval_token: token,
        review_token: token,
        token_expires_at: expiresAt.toISOString(),
        status: 'sent',
        sent_at: now,
        client_sent_at: now,
        updated_at: now,
      })
      .eq('id', approval.id)
      .eq('agency_id', params.agencyId)
      .select('*')
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to send approval');

    const reviewUrl = params.appUrl
      ? `${params.appUrl.replace(/\/$/, '')}/approval/${token}`
      : buildApprovalUrl(token);
    assertSafeEmailUrl(reviewUrl, 'approval review link');

    const { data: agency } = await this.supabase
      .from('agencies')
      .select('name')
      .eq('id', params.agencyId)
      .single();

    await sendEmailWithForensicLogging(
      {
        from: getResendFromEmail(),
        to: client.email,
        subject: updated.message_subject || defaultMessageSubject(updated.matter_reference || ''),
        html: buildApprovalEmailHtml({
          agencyName: agency?.name || 'ImmiMate',
          clientName: client.name,
          matterReference: updated.matter_reference || '',
          messageBody: (updated.message_body || '').replace(/\n/g, '<br/>'),
          reviewUrl,
        }),
      },
      { emailType: 'application_approval_send', agencyId: params.agencyId },
    );

    await this.logEvent({
      agencyId: params.agencyId,
      approvalId: approval.id,
      matterId: approval.matter_id,
      clientId: approval.client_id,
      eventType: 'approval_sent',
      description: `Application approval sent to ${client.email}`,
      actorId: params.userId,
      metadata: { review_url: reviewUrl },
    });

    await logApprovalActivity(this.supabase, {
      agency_id: params.agencyId,
      user_id: params.userId,
      type: 'approval_sent',
      title: 'Application approval sent',
      description: `Sent to ${client.name} (${client.email})`,
      approval_id: approval.id,
    });

    await notifyApprovalUser(this.supabase, {
      agencyId: params.agencyId,
      agencySlug: params.agencySlug,
      userId: params.userId,
      title: 'Approval request sent',
      message: `Application approval sent to ${client.name}`,
      approvalId: approval.id,
      category: 'approval',
    });

    if (approval.matter_id) {
      await this.supabase
        .from('matters')
        .update({ approval_id: approval.id, updated_at: now })
        .eq('id', approval.matter_id)
        .eq('agency_id', params.agencyId);
    }

    return { approval: updated as ApplicationApprovalRecord, reviewUrl };
  }

  async getByToken(token: string): Promise<ApplicationApprovalRecord | null> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('application_approvals')
      .select('*, clients(name, email, phone)')
      .eq('approval_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    return (data as ApplicationApprovalRecord) || null;
  }

  async markViewed(token: string, ip?: string, userAgent?: string) {
    const admin = createAdminClient();
    const approval = await this.getByToken(token);
    if (!approval) throw new NotFoundError('Link not found');
    if (this.isExpired(approval)) throw new GoneError('Link expired');
    if (['approved', 'changes_requested'].includes(approval.status)) return approval;

    if (approval.status === 'sent') {
      const now = new Date().toISOString();
      await admin
        .from('application_approvals')
        .update({ status: 'viewed', viewed_at: now, client_viewed_at: now, updated_at: now })
        .eq('id', approval.id);

      await this.logEvent({
        agencyId: approval.agency_id,
        approvalId: approval.id,
        matterId: approval.matter_id,
        clientId: approval.client_id,
        eventType: 'client_viewed',
        description: 'Client viewed application approval',
        ipAddress: ip,
        userAgent,
      });
    }

    return this.getByToken(token);
  }

  async approveByToken(params: {
    token: string;
    clientName: string;
    ip?: string;
    userAgent?: string;
  }) {
    const admin = createAdminClient();
    const approval = await this.getByToken(params.token);
    if (!approval) throw new NotFoundError('Link not found');
    if (this.isExpired(approval)) throw new GoneError('Link expired');
    if (approval.status === 'approved' || approval.status === 'changes_requested') {
      throw new ConflictError(APPROVAL_ALREADY_COMPLETED_MESSAGE);
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from('application_approvals')
      .update({
        status: 'approved',
        approved_at: now,
        client_signed_at: now,
        client_name_confirmed: params.clientName.trim(),
        client_ip: params.ip || null,
        client_user_agent: params.userAgent || null,
        updated_at: now,
      })
      .eq('id', approval.id);

    if (error) throw new Error(error.message);

    await this.logEvent({
      agencyId: approval.agency_id,
      approvalId: approval.id,
      matterId: approval.matter_id,
      clientId: approval.client_id,
      eventType: 'client_approved',
      description: `Client approved application (${params.clientName})`,
      ipAddress: params.ip,
      userAgent: params.userAgent,
    });

    await logApprovalActivity(admin, {
      agency_id: approval.agency_id,
      user_id: approval.created_by,
      type: 'approval_client_approved',
      title: 'Client approved application',
      description: `${params.clientName} approved matter ${approval.matter_reference || ''}`,
      approval_id: approval.id,
    });

    await notifyApprovalUser(admin, {
      agencyId: approval.agency_id,
      userId: approval.created_by,
      title: 'Application approved by client',
      message: `${params.clientName} approved the application for ${approval.matter_reference || 'matter'}`,
      approvalId: approval.id,
      category: 'approval',
    });

    await admin.from('document_audit_events').insert({
      agency_id: approval.agency_id,
      client_id: approval.client_id,
      matter_id: approval.matter_id,
      document_type: 'application_approval',
      document_id: approval.id,
      event_type: 'signed',
      actor_name: params.clientName,
      ip_address: params.ip || null,
    });

    return this.getByToken(params.token);
  }

  async requestChangesByToken(params: {
    token: string;
    reason: string;
    ip?: string;
    userAgent?: string;
  }) {
    const admin = createAdminClient();
    const approval = await this.getByToken(params.token);
    if (!approval) throw new NotFoundError('Link not found');
    if (this.isExpired(approval)) throw new GoneError('Link expired');
    if (['approved', 'changes_requested'].includes(approval.status)) {
      throw new ConflictError(APPROVAL_ALREADY_COMPLETED_MESSAGE);
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from('application_approvals')
      .update({
        status: 'changes_requested',
        changes_requested_at: now,
        rejected_at: now,
        change_request_reason: params.reason.trim(),
        client_ip: params.ip || null,
        client_user_agent: params.userAgent || null,
        updated_at: now,
      })
      .eq('id', approval.id);

    if (error) throw new Error(error.message);

    await this.logEvent({
      agencyId: approval.agency_id,
      approvalId: approval.id,
      matterId: approval.matter_id,
      clientId: approval.client_id,
      eventType: 'client_requested_changes',
      description: params.reason.trim(),
      ipAddress: params.ip,
      userAgent: params.userAgent,
    });

    await notifyApprovalUser(admin, {
      agencyId: approval.agency_id,
      userId: approval.created_by,
      title: 'Client requested changes',
      message: params.reason.trim(),
      approvalId: approval.id,
      category: 'approval',
    });

    return this.getByToken(params.token);
  }

  async logDownload(token: string, ip?: string, userAgent?: string) {
    const approval = await this.getByToken(token);
    if (!approval) return;

    await this.logEvent({
      agencyId: approval.agency_id,
      approvalId: approval.id,
      matterId: approval.matter_id,
      clientId: approval.client_id,
      eventType: 'client_downloaded',
      description: 'Client downloaded application',
      ipAddress: ip,
      userAgent,
    });
  }

  async getSignedDownloadUrl(approval: ApplicationApprovalRecord) {
    if (!approval.application_file_path) throw new Error('No file');
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(approval.application_file_path, 3600);
    if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
    return data.signedUrl;
  }

  async getWidgetCounts(agencyId: string) {
    const statuses: ApplicationApprovalStatus[] = [
      'sent',
      'viewed',
      'approved',
      'changes_requested',
    ];
    const counts: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await this.supabase
        .from('application_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', s)
        .is('deleted_at', null);
      counts[s] = count || 0;
    }
    return {
      pendingReview: counts.sent || 0,
      viewed: counts.viewed || 0,
      approved: counts.approved || 0,
      changesRequested: counts.changes_requested || 0,
    };
  }

  async getById(agencyId: string, id: string) {
    const { data } = await this.supabase
      .from('application_approvals')
      .select('*, clients(name, email, phone)')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .is('deleted_at', null)
      .maybeSingle();
    return (data as ApplicationApprovalRecord) || null;
  }

  isExpired(approval: ApplicationApprovalRecord) {
    if (approval.status === 'expired') return true;
    if (approval.token_expires_at && new Date(approval.token_expires_at) < new Date()) return true;
    return false;
  }

  isCompleted(approval: ApplicationApprovalRecord) {
    return ['approved', 'changes_requested', 'expired'].includes(approval.status);
  }

  storagePath(agencyId: string, matterId: string, fileName: string) {
    return `${agencyId}/${matterId}/${fileName}`;
  }

  private async resolveMatterFromAgreement(agencyId: string, clientId: string, agreementId: string) {
    const { data } = await this.supabase
      .from('matters')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('agreement_id', agreementId)
      .maybeSingle();
    return data?.id || null;
  }

  private async resolveMatterFromApproval(agencyId: string, approvalId: string) {
    const { data } = await this.supabase
      .from('application_approvals')
      .select('matter_id')
      .eq('agency_id', agencyId)
      .eq('id', approvalId)
      .maybeSingle();
    return data?.matter_id || null;
  }

  private async ensureMatter(agencyId: string, clientId: string, agreementId?: string) {
    let safeAgreementId: string | null = null;
    if (agreementId) {
      const { data: agreement } = await this.supabase
        .from('agreements')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('id', agreementId)
        .maybeSingle();
      safeAgreementId = agreement?.id || null;
    }

    const { data: matterType } = await this.supabase
      .from('matter_types')
      .select('id')
      .eq('agency_id', agencyId)
      .limit(1)
      .maybeSingle();

    const { data: owner } = await this.supabase
      .from('users')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();

    const { data: created, error } = await this.supabase
      .from('matters')
      .insert({
        agency_id: agencyId,
        client_id: clientId,
        matter_type_id: matterType?.id,
        visa_subclass: 'TBC',
        assigned_rma_id: owner?.id,
        agreement_id: safeAgreementId,
        status: 'active',
      })
      .select('id')
      .single();

    if (error || !created) throw new Error(error?.message || 'Could not create matter');
    return created.id;
  }

  private async logEvent(params: {
    agencyId: string;
    approvalId: string;
    matterId?: string | null;
    clientId?: string | null;
    eventType: string;
    description?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const admin = createAdminClient();
    await admin.from('application_approval_events').insert({
      agency_id: params.agencyId,
      approval_id: params.approvalId,
      matter_id: params.matterId || null,
      client_id: params.clientId || null,
      event_type: params.eventType,
      actor_type: params.actorId ? 'agent' : 'client',
      actor_id: params.actorId || null,
      description: params.description || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  }
}

function buildApprovalEmailHtml(params: {
  agencyName: string;
  clientName: string;
  matterReference: string;
  messageBody: string;
  reviewUrl: string;
}) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <p style="font-size:12px;color:#5C5C5C;text-transform:uppercase;letter-spacing:0.08em">${params.agencyName}</p>
      <h1 style="font-size:22px;font-weight:600;margin:16px 0">Application for Review &amp; Approval</h1>
      <p style="font-size:14px;line-height:1.6;color:#333">${params.messageBody}</p>
      <p style="margin:28px 0">
        <a href="${params.reviewUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600">
          Review Application
        </a>
      </p>
      <p style="font-size:12px;color:#888">Matter: ${params.matterReference}. This link expires in 90 days.</p>
    </div>
  `;
}

export { BUCKET as APPLICATION_APPROVALS_BUCKET };
