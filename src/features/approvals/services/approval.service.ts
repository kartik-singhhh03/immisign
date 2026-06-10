import { SupabaseClient } from '@supabase/supabase-js';
import type { DbRole } from '@/lib/auth/db-roles';
import {
  canCreateApproval,
  canEditApprovalDraft,
  canPerformApprovalAction,
  canViewApproval,
} from '@/lib/permissions/approval-actions';
import {
  logApprovalActivity,
  logApprovalCompleted,
  logCertificateGenerated,
  notifyApprovalUser,
} from '../lib/activity-log';
import { parseMentions, resolveMentionedUserIds } from '@/lib/notifications/mentions';
import { TaskService } from '@/lib/tasks/task.service';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  maybeRecordClientCompleteNote,
  recordClientSystemNote,
} from '@/features/file-notes/services/file-notes.service';
import { ApprovalRepository } from '../repositories/approvals.repository';
import { ApprovalCertificateService } from './approval-certificate.service';
import { ApprovalSignWellService } from './approval-signwell.service';
import { ApprovalStateMachine } from './state-machine';
import { recordComplianceEvent } from '@/lib/compliance/compliance-events.service';
import {
  ApplicationApproval,
  ApprovalAction,
  ApprovalListFilters,
  ApprovalStatus,
} from '../types';

const ACTION_LABELS: Record<ApprovalAction, string> = {
  submit: 'Submitted for review',
  start_review: 'Review started',
  request_changes: 'Changes requested',
  approve: 'Approved',
  reject: 'Rejected',
  resubmit: 'Resubmitted after changes',
  ready_to_lodge: 'Marked ready to lodge',
  lodged: 'Marked lodged',
  close: 'Matter closed',
  assign_reviewer: 'Reviewer assigned',
  assign_rma: 'RMA assigned',
};

export class ApprovalService {
  private repo: ApprovalRepository;

  constructor(private supabase: SupabaseClient) {
    this.repo = new ApprovalRepository(supabase);
  }

  private async getAgencySlug(agencyId: string): Promise<string> {
    const { data } = await this.supabase.from('agencies').select('slug').eq('id', agencyId).single();
    return data?.slug || 'workspace';
  }

  async createApproval(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    data: {
      client_id?: string | null;
      title: string;
      visa_subclass?: string | null;
      matter_type_id?: string | null;
      matter_reference?: string | null;
      priority?: string;
      notes?: string | null;
      internal_notes?: string | null;
      lodgement_deadline?: string | null;
    },
  ) {
    if (!canCreateApproval(dbRole)) throw new Error('Unauthorized to create approvals');

    const approval = await this.repo.create({
      agency_id: agencyId,
      created_by: userId,
      client_id: data.client_id ?? null,
      title: data.title,
      visa_subclass: data.visa_subclass ?? null,
      matter_type_id: data.matter_type_id ?? null,
      matter_reference: data.matter_reference ?? null,
      priority: data.priority ?? 'normal',
      notes: data.notes ?? null,
      internal_notes: data.internal_notes ?? null,
      lodgement_deadline: data.lodgement_deadline ?? null,
    });

    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.created',
      title: 'Application approval created',
      description: approval.approval_number ?? approval.title,
      approval_id: approval.id,
    });

    await recordComplianceEvent(this.supabase, {
      agencyId,
      clientId: data.client_id ?? null,
      eventType: 'approval_created',
      fileSource: 'application_approval',
      fileId: approval.id,
      actorUserId: userId,
      metadata: { approval_number: approval.approval_number },
    });

    return approval;
  }

  async list(agencyId: string, dbRole: DbRole, userId: string, filters: ApprovalListFilters) {
    const scoped = { ...filters };
    if (dbRole === 'agent') scoped.agentId = userId;
    if (dbRole === 'support') scoped.reviewerId = userId;

    const result = await this.repo.list(agencyId, scoped);
    const data = result.data.filter((row) => canViewApproval(dbRole, row, userId));
    return { data, count: result.count };
  }

  async getDetail(agencyId: string, id: string, dbRole: DbRole, userId: string) {
    const approval = await this.repo.getById(id, agencyId);
    if (!approval) throw new Error('Not found');
    if (!canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');
    const [comments, attachments, checklist, timeline, team] = await Promise.all([
      this.repo.getComments(id),
      this.repo.getAttachments(id),
      this.repo.getChecklist(id),
      this.repo.getActivityTimeline(id, agencyId),
      this.repo.getAgencyTeam(agencyId),
    ]);
    const userMap = Object.fromEntries(
      team.map((u: { id: string; full_name?: string; email?: string }) => [
        u.id,
        u.full_name || u.email || 'User',
      ]),
    );
    return { approval, comments, attachments, checklist, timeline, userMap };
  }

  async updateDraft(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    id: string,
    updates: Partial<ApplicationApproval>,
  ) {
    const existing = await this.repo.getById(id, agencyId);
    if (!existing) throw new Error('Not found');
    if (!canEditApprovalDraft(dbRole, existing, userId)) throw new Error('Unauthorized');

    const updated = await this.repo.update(id, updates);
    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.updated',
      title: 'Approval updated',
      approval_id: id,
    });
    return updated;
  }

  async transition(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    id: string,
    action: ApprovalAction,
    payload?: { comment?: string; assigned_reviewer_id?: string; assigned_rma_id?: string },
  ) {
    const approval = await this.repo.getById(id, agencyId);
    if (!approval) throw new Error('Not found');
    if (!canPerformApprovalAction(dbRole, action, approval, userId)) {
      throw new Error('Unauthorized for this action');
    }

    const now = new Date().toISOString();
    const updates: Partial<ApplicationApproval> = {};

    if (action === 'assign_reviewer' && payload?.assigned_reviewer_id) {
      updates.assigned_reviewer_id = payload.assigned_reviewer_id;
      const updated = await this.repo.update(id, updates);
      await this.afterTransition(agencyId, userId, approval, action, updated, payload);
      const slug = await this.getAgencySlug(agencyId);
      await notifyApprovalUser(this.supabase, {
        agencyId,
        agencySlug: slug,
        userId: payload.assigned_reviewer_id,
        title: 'Application assigned for review',
        message: `You were assigned to review ${approval.approval_number || approval.title}`,
        approvalId: id,
        actorId: userId,
      });
      const tasks = new TaskService(this.supabase);
      await tasks.create({
        agencyId,
        agencySlug: slug,
        createdBy: userId,
        title: `Review application: ${approval.approval_number || approval.title}`,
        assignedTo: payload.assigned_reviewer_id,
        entityType: 'application_approval',
        entityId: id,
        dueAt: approval.lodgement_deadline ?? undefined,
      });
      return updated;
    }

    if (action === 'assign_rma' && payload?.assigned_rma_id) {
      updates.assigned_rma_id = payload.assigned_rma_id;
      const updated = await this.repo.update(id, updates);
      await this.afterTransition(agencyId, userId, approval, action, updated, payload);
      return updated;
    }

    const nextStatus = ApprovalStateMachine.applyAction(
      approval.status as ApprovalStatus,
      action,
    );
    updates.status = nextStatus;

    if (action === 'submit' || action === 'resubmit') updates.submitted_at = now;
    if (action === 'approve') updates.approved_at = now;
    if (action === 'reject') updates.rejected_at = now;
    if (action === 'ready_to_lodge') updates.ready_to_lodge_at = now;
    if (action === 'lodged') updates.lodged_at = now;
    if (action === 'close') updates.closed_at = now;
    if (action === 'request_changes') {
      updates.revision_count = (approval.revision_count || 0) + 1;
    }

    const updated = await this.repo.update(id, updates);

    if (payload?.comment) {
      await this.repo.addComment({
        approval_id: id,
        author_type: 'agent',
        author_id: userId,
        author_role: dbRole,
        visibility: action === 'request_changes' ? 'internal' : 'internal',
        content: payload.comment,
        mentions: [],
      });
    }

    await this.afterTransition(agencyId, userId, approval, action, updated, payload);
    await this.notifyTransition(agencyId, approval, updated, action, payload);

    if (action === 'lodged' && approval.client_id) {
      const admin = createAdminClient();
      await recordClientSystemNote(admin, {
        agencyId,
        clientId: approval.client_id,
        actorUserId: userId,
        body: `Application ${updated.approval_number || updated.title} marked as lodged.`,
        referenceType: 'application_approval',
        referenceId: updated.id,
        fileSource: 'application_approval',
        fileId: updated.id,
      });
      await recordComplianceEvent(admin, {
        agencyId,
        clientId: approval.client_id,
        eventType: 'lodgement_recorded',
        fileSource: 'application_approval',
        fileId: updated.id,
        actorUserId: userId,
        metadata: { approval_number: updated.approval_number },
      });
      await maybeRecordClientCompleteNote(admin, agencyId, approval.client_id, userId, {
        agreementId: null,
        approvalId: updated.id,
        fileSource: 'application_approval',
        fileId: updated.id,
      });
    }

    return updated;
  }

  private async afterTransition(
    agencyId: string,
    userId: string,
    before: ApplicationApproval,
    action: ApprovalAction,
    after: ApplicationApproval,
    payload?: { comment?: string },
  ) {
    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: `approval.${action}`,
      title: ACTION_LABELS[action],
      description: payload?.comment?.slice(0, 200) || `${before.status} → ${after.status}`,
      approval_id: after.id,
    });
  }

  private async notifyTransition(
    agencyId: string,
    before: ApplicationApproval,
    after: ApplicationApproval,
    action: ApprovalAction,
    payload?: { assigned_reviewer_id?: string },
  ) {
    const slug = await this.getAgencySlug(agencyId);
    const notifyUser = async (userId: string | null | undefined, title: string, message: string) => {
      if (!userId) return;
      await notifyApprovalUser(this.supabase, {
        agencyId,
        agencySlug: slug,
        userId,
        title,
        message,
        approvalId: after.id,
        category: 'approval',
      });
    };

    switch (action) {
      case 'request_changes':
        await notifyUser(
          before.created_by,
          'Changes requested',
          `${after.approval_number || after.title} requires changes`,
        );
        break;
      case 'approve':
        await notifyUser(
          before.created_by,
          'Application approved',
          `${after.approval_number || after.title} was approved`,
        );
        if (before.assigned_rma_id) {
          await notifyUser(before.assigned_rma_id, 'Ready for RMA sign-off', after.title);
        }
        break;
      case 'reject':
        await notifyUser(before.created_by, 'Application rejected', after.title);
        break;
      case 'ready_to_lodge':
        await notifyUser(before.created_by, 'Ready to lodge', after.title);
        break;
      case 'lodged':
        await notifyUser(before.created_by, 'Application lodged', after.title);
        break;
      case 'close':
        await notifyUser(before.created_by, 'Matter closed', after.title);
        break;
      case 'submit':
        if (payload?.assigned_reviewer_id || after.assigned_reviewer_id) {
          await notifyUser(
            after.assigned_reviewer_id ?? payload?.assigned_reviewer_id,
            'Review requested',
            after.title,
          );
        }
        break;
      default:
        break;
    }
  }

  async addComment(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    approvalId: string,
    content: string,
    options?: { visibility?: 'internal' | 'client_visible'; parent_id?: string; mentions?: string[] },
  ) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval || !canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');

    const handles = parseMentions(content);
    const mentionedIds = await resolveMentionedUserIds(this.supabase, agencyId, handles);
    const slug = await this.getAgencySlug(agencyId);

    const comment = await this.repo.addComment({
      approval_id: approvalId,
      author_type: 'agent',
      author_id: userId,
      author_role: dbRole,
      visibility: options?.visibility ?? 'internal',
      parent_id: options?.parent_id ?? null,
      content,
      mentions: mentionedIds,
    });

    for (const mentionedId of mentionedIds) {
      if (mentionedId === userId) continue;
      await notifyApprovalUser(this.supabase, {
        agencyId,
        agencySlug: slug,
        userId: mentionedId,
        title: 'You were mentioned',
        message: content.slice(0, 120),
        approvalId,
        actorId: userId,
        category: 'comment',
      });
    }

    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.comment',
      title: 'Comment added',
      description: content.slice(0, 120),
      approval_id: approvalId,
    });

    return comment;
  }

  async toggleChecklistItem(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    approvalId: string,
    itemId: string,
    isCompleted: boolean,
  ) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval || !canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');
    if (dbRole === 'viewer' || dbRole === 'reviewer') throw new Error('Read-only');

    const item = await this.repo.updateChecklistItem(itemId, {
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      completed_by: isCompleted ? userId : null,
    });

    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.checklist',
      title: isCompleted ? `Checklist: ${item.label} completed` : `Checklist: ${item.label} unchecked`,
      approval_id: approvalId,
    });

    if (isCompleted && approval.assigned_reviewer_id && approval.assigned_reviewer_id !== userId) {
      const slug = await this.getAgencySlug(agencyId);
      await notifyApprovalUser(this.supabase, {
        agencyId,
        agencySlug: slug,
        userId: approval.assigned_reviewer_id,
        title: 'Checklist item completed',
        message: `${item.label} was marked complete on ${approval.approval_number || approval.title}`,
        approvalId,
        actorId: userId,
        category: 'checklist',
      });
    }

    return item;
  }

  async uploadAttachment(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    approvalId: string,
    file: { file_name: string; storage_path: string; mime_type?: string; file_size?: number },
  ) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval || !canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');
    if (dbRole === 'viewer' || dbRole === 'reviewer') throw new Error('Read-only');

    const existing = await this.repo.getAttachments(approvalId);
    const version = (existing[0]?.version_number || 0) + 1;

    const attachment = await this.repo.addAttachment({
      agency_id: agencyId,
      approval_id: approvalId,
      uploaded_by: userId,
      file_name: file.file_name,
      storage_path: file.storage_path,
      mime_type: file.mime_type ?? null,
      file_size: file.file_size ?? null,
      version_number: version,
      is_current: true,
    });

    await this.repo.update(approvalId, { document_path: file.storage_path, version_number: version });

    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.attachment',
      title: 'Attachment uploaded',
      description: file.file_name,
      approval_id: approvalId,
    });

    return attachment;
  }

  async markViewedByClient(token: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error('Not found');
    if (approval.client_viewed_at) return approval;

    return this.repo.update(approval.id, {
      client_viewed_at: new Date().toISOString(),
    });
  }

  async clientApproveByToken(token: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error('Not found');
    if (approval.signwell_document_id) {
      throw new Error('This application requires electronic signature via the email link.');
    }
    if (approval.client_signed_at) return approval;

    const now = new Date().toISOString();
    const updated = await this.repo.update(approval.id, {
      client_signed_at: now,
      approved_at: approval.approved_at || now,
      status: ApprovalStatus.APPROVED,
    });

    const certApproval = await this.ensureCertificate(approval.agency_id, updated.id);

    const slug = await this.getAgencySlug(approval.agency_id);
    await logApprovalActivity(this.supabase, {
      agency_id: approval.agency_id,
      user_id: approval.created_by,
      type: 'approval.client_approved',
      title: 'Client approved application',
      description: approval.approval_number || approval.title,
      approval_id: approval.id,
    });
    await notifyApprovalUser(this.supabase, {
      agencyId: approval.agency_id,
      agencySlug: slug,
      userId: approval.created_by,
      title: 'Client approved application',
      message: `${approval.approval_number || approval.title} was approved by the client.`,
      approvalId: approval.id,
      category: 'approval',
    });
    if (certApproval.certificate_storage_path) {
      await logApprovalCompleted(this.supabase, {
        agency_id: approval.agency_id,
        user_id: approval.created_by,
        approval_id: approval.id,
        approval_number: approval.approval_number,
        title: approval.title,
        agencySlug: slug,
        via: 'portal',
      });
    }

    return updated;
  }

  async clientRequestChangesByToken(token: string, content: string) {
    const approval = await this.repo.getByToken(token);
    if (!approval) throw new Error('Not found');

    await this.repo.addComment({
      approval_id: approval.id,
      author_type: 'client',
      author_id: null,
      author_role: 'client',
      visibility: 'client_visible',
      content,
      mentions: [],
    });

    const updated = await this.repo.update(approval.id, {
      status: ApprovalStatus.CHANGES_REQUESTED,
      revision_count: (approval.revision_count || 0) + 1,
    });

    const slug = await this.getAgencySlug(approval.agency_id);
    await logApprovalActivity(this.supabase, {
      agency_id: approval.agency_id,
      user_id: approval.created_by,
      type: 'approval.client_changes_requested',
      title: 'Client requested changes',
      description: content.slice(0, 200),
      approval_id: approval.id,
    });
    await notifyApprovalUser(this.supabase, {
      agencyId: approval.agency_id,
      agencySlug: slug,
      userId: approval.created_by,
      title: 'Client requested changes',
      message: content.slice(0, 120),
      approvalId: approval.id,
      category: 'approval',
    });

    return updated;
  }

  async sendForClientApproval(
    agencyId: string,
    userId: string,
    dbRole: DbRole,
    approvalId: string,
  ) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval) throw new Error('Not found');
    if (!canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');
    if (!['approved', 'under_review', 'draft'].includes(approval.status)) {
      throw new Error('Application must be prepared before sending to the client.');
    }
    if (!approval.document_path) {
      throw new Error('Upload the application PDF before sending to the client.');
    }

    const signService = new ApprovalSignWellService(this.supabase);
    const swResult = await signService.sendForClientSignature(agencyId, approval);

    const now = new Date().toISOString();
    const updates: Partial<ApplicationApproval> = {
      client_sent_at: now,
      signwell_document_id: swResult.id,
      status:
        approval.status === ApprovalStatus.DRAFT
          ? ApprovalStatus.UNDER_REVIEW
          : approval.status,
    };

    const updated = await this.repo.update(approvalId, updates);

    if (approval.client_id) {
      const admin = createAdminClient();
      await recordClientSystemNote(admin, {
        agencyId,
        clientId: approval.client_id,
        actorUserId: userId,
        body: `Application ${approval.approval_number || approval.title} sent to client for approval.`,
        referenceType: 'application_approval',
        referenceId: approvalId,
      });
    }

    const slug = await this.getAgencySlug(agencyId);
    await logApprovalActivity(this.supabase, {
      agency_id: agencyId,
      user_id: userId,
      type: 'approval.client_sent',
      title: 'Sent to client for approval',
      description: approval.approval_number || approval.title,
      approval_id: approvalId,
    });
    await notifyApprovalUser(this.supabase, {
      agencyId,
      agencySlug: slug,
      userId,
      title: 'Application sent for client approval',
      message: `${approval.approval_number || approval.title} sent to client via SignWell.`,
      approvalId,
      category: 'approval',
      actorId: userId,
    });

    await recordComplianceEvent(this.supabase, {
      agencyId,
      clientId: approval.client_id,
      eventType: 'approval_sent',
      fileSource: 'application_approval',
      fileId: approvalId,
      actorUserId: userId,
      metadata: { approval_number: approval.approval_number },
    });

    return { approval: updated, reviewUrl: `/review/${approval.review_token}`, signwellId: swResult.id };
  }

  async ensureCertificate(agencyId: string, approvalId: string) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval) throw new Error('Not found');
    if (approval.certificate_storage_path && approval.certificate_generated_at) {
      return approval;
    }
    if (!approval.client_signed_at) {
      throw new Error('Client must sign before generating a certificate.');
    }

    const { data: agency } = await this.supabase
      .from('agencies')
      .select('name')
      .eq('id', agencyId)
      .single();

    const certService = new ApprovalCertificateService(this.supabase);
    const { storagePath, generatedAt } = await certService.generate(
      agencyId,
      approval,
      agency?.name || 'Agency',
    );

    const updated = await this.repo.update(approvalId, {
      certificate_storage_path: storagePath,
      certificate_generated_at: generatedAt,
    });

    if (approval.client_id) {
      const admin = createAdminClient();
      await recordClientSystemNote(admin, {
        agencyId,
        clientId: approval.client_id,
        body: `Certificate of Approval generated for ${approval.approval_number || approval.title}.`,
        referenceType: 'application_approval',
        referenceId: approvalId,
      });
    }

    const slug = await this.getAgencySlug(agencyId);
    await logCertificateGenerated(this.supabase, {
      agency_id: agencyId,
      user_id: approval.created_by,
      approval_id: approvalId,
      approval_number: approval.approval_number,
      title: approval.title,
      agencySlug: slug,
    });

    return updated;
  }

  async getCertificateSignedUrl(agencyId: string, approvalId: string, dbRole: DbRole, userId: string) {
    const approval = await this.repo.getById(approvalId, agencyId);
    if (!approval) throw new Error('Not found');
    if (!canViewApproval(dbRole, approval, userId)) throw new Error('Unauthorized');
    if (!approval.certificate_storage_path) throw new Error('Certificate not generated');

    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(approval.certificate_storage_path, 3600);

    if (error || !data?.signedUrl) throw new Error('Could not load certificate');
    return data.signedUrl;
  }

  async getWidgetCounts(agencyId: string, userId: string, dbRole: DbRole) {
    const [
      awaitingReview,
      awaitingApproval,
      changesRequested,
      readyToLodge,
      recentlyApproved,
      myAssigned,
      incompleteChecklists,
    ] = await Promise.all([
      this.repo.countByStatus(agencyId, [ApprovalStatus.SUBMITTED, ApprovalStatus.UNDER_REVIEW]),
      this.repo.countByStatus(agencyId, [ApprovalStatus.UNDER_REVIEW]),
      this.repo.countByStatus(agencyId, [ApprovalStatus.CHANGES_REQUESTED]),
      this.repo.countByStatus(agencyId, [ApprovalStatus.READY_TO_LODGE]),
      this.repo.list(agencyId, {
        status: ApprovalStatus.APPROVED,
        limit: 5,
        page: 1,
      }),
      this.repo.countAssignedReviewer(agencyId, userId),
      this.supabase
        .from('approval_checklist_items')
        .select('approval_id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('is_completed', false),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentApproved = (recentlyApproved.data || []).filter(
      (a) => a.approved_at && a.approved_at >= sevenDaysAgo,
    ).length;

    return {
      awaitingReview,
      awaitingApproval,
      changesRequested,
      readyToLodge,
      recentlyApproved: recentApproved,
      myAssignedReviews: myAssigned,
      openChecklistItems: incompleteChecklists.count ?? 0,
    };
  }
}
