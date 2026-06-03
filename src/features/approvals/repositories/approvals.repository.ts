import { SupabaseClient } from '@supabase/supabase-js';
import {
  ApplicationApproval,
  ApprovalAttachment,
  ApprovalChecklistItem,
  ApprovalComment,
  ApprovalListFilters,
  ApprovalStatus,
  DEFAULT_CHECKLIST_ITEMS,
} from '../types';

export type ApprovalListRow = ApplicationApproval & {
  clients?: { name: string; email?: string } | null;
  matter_types?: { name: string } | null;
};

export class ApprovalRepository {
  constructor(private supabase: SupabaseClient) {}

  async generateApprovalNumber(agencyId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('next_approval_number', {
      p_agency_id: agencyId,
    });
    if (error) throw error;
    return data as string;
  }

  async create(
    data: Partial<ApplicationApproval> & { agency_id: string; created_by: string },
  ): Promise<ApplicationApproval> {
    const approvalNumber = await this.generateApprovalNumber(data.agency_id);
    const { data: approval, error } = await this.supabase
      .from('application_approvals')
      .insert({
        ...data,
        approval_number: approvalNumber,
        status: ApprovalStatus.DRAFT,
        review_token: crypto.randomUUID(),
      })
      .select()
      .single();
    if (error) throw error;

    const checklistRows = DEFAULT_CHECKLIST_ITEMS.map((item) => ({
      agency_id: data.agency_id,
      approval_id: approval.id,
      item_key: item.item_key,
      label: item.label,
      sort_order: item.sort_order,
    }));
    const { error: checklistError } = await this.supabase
      .from('approval_checklist_items')
      .insert(checklistRows);
    if (checklistError) throw checklistError;

    return approval as ApplicationApproval;
  }

  async getById(id: string, agencyId?: string): Promise<ApprovalListRow | null> {
    let query = this.supabase
      .from('application_approvals')
      .select(`*, clients(name, email), matter_types(name)`)
      .eq('id', id)
      .is('deleted_at', null);

    if (agencyId) query = query.eq('agency_id', agencyId);

    const { data, error } = await query.single();
    if (error || !data) return null;
    return data as ApprovalListRow;
  }

  async list(agencyId: string, filters: ApprovalListFilters = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      agentId,
      reviewerId,
      matterTypeId,
      priority,
      dateFrom,
      dateTo,
    } = filters;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('application_approvals')
      .select(`*, clients(name, email), matter_types(name)`, { count: 'exact' })
      .eq('agency_id', agencyId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,approval_number.ilike.%${search}%,matter_reference.ilike.%${search}%`,
      );
    }
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query = query.in('status', statuses);
    }
    if (agentId) query = query.eq('created_by', agentId);
    if (reviewerId) query = query.eq('assigned_reviewer_id', reviewerId);
    if (matterTypeId) query = query.eq('matter_type_id', matterTypeId);
    if (priority) query = query.eq('priority', priority);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as ApprovalListRow[], count: count || 0 };
  }

  async countByStatus(agencyId: string, statuses: ApprovalStatus[]): Promise<number> {
    const { count, error } = await this.supabase
      .from('application_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .is('deleted_at', null)
      .in('status', statuses);
    if (error) throw error;
    return count || 0;
  }

  async countAssignedReviewer(agencyId: string, userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('application_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('assigned_reviewer_id', userId)
      .in('status', ['submitted', 'under_review'])
      .is('deleted_at', null);
    if (error) throw error;
    return count || 0;
  }

  async update(id: string, updates: Partial<ApplicationApproval>): Promise<ApplicationApproval> {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ApplicationApproval;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('application_approvals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async getComments(approvalId: string): Promise<ApprovalComment[]> {
    const { data, error } = await this.supabase
      .from('approval_comments')
      .select('*')
      .eq('approval_id', approvalId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ApprovalComment[];
  }

  async addComment(
    row: Omit<ApprovalComment, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ApprovalComment> {
    const { data, error } = await this.supabase
      .from('approval_comments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as ApprovalComment;
  }

  async getAttachments(approvalId: string): Promise<ApprovalAttachment[]> {
    const { data, error } = await this.supabase
      .from('approval_attachments')
      .select('*')
      .eq('approval_id', approvalId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ApprovalAttachment[];
  }

  async addAttachment(
    row: Omit<ApprovalAttachment, 'id' | 'created_at'>,
  ): Promise<ApprovalAttachment> {
    if (row.is_current) {
      await this.supabase
        .from('approval_attachments')
        .update({ is_current: false })
        .eq('approval_id', row.approval_id);
    }
    const { data, error } = await this.supabase
      .from('approval_attachments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as ApprovalAttachment;
  }

  async getChecklist(approvalId: string): Promise<ApprovalChecklistItem[]> {
    const { data, error } = await this.supabase
      .from('approval_checklist_items')
      .select('*')
      .eq('approval_id', approvalId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []) as ApprovalChecklistItem[];
  }

  async updateChecklistItem(
    itemId: string,
    updates: Partial<ApprovalChecklistItem>,
  ): Promise<ApprovalChecklistItem> {
    const { data, error } = await this.supabase
      .from('approval_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data as ApprovalChecklistItem;
  }

  async getActivityTimeline(approvalId: string, agencyId: string) {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('reference_id', approvalId)
      .eq('reference_type', 'application_approval')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getAgencyTeam(agencyId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', agencyId)
      .order('full_name');
    if (error) throw error;
    return data || [];
  }
}
