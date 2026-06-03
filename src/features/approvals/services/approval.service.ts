import { SupabaseClient } from '@supabase/supabase-js';
import type { DbRole } from '@/lib/auth/db-roles';
import {
  canCreateApproval,
  canEditApprovalDraft,
  canPerformApprovalAction,
  canViewApproval,
} from '@/lib/permissions/approval-actions';
import { logApprovalActivity, notifyApprovalUser } from '../lib/activity-log';
import { parseMentions, resolveMentionedUserIds } from '@/lib/notifications/mentions';
import { TaskService } from '@/lib/tasks/task.service';
import { ApprovalRepository } from '../repositories/approvals.repository';
import { ApprovalStateMachine } from './state-machine';
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
