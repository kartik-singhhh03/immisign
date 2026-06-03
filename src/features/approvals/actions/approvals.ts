"use server"

import { createClient } from '@/lib/supabase/server';
import { uiRoleToDb, type DbRole } from '@/lib/auth/db-roles';
import { ApprovalService } from '../services/approval.service';
import type { ApprovalAction } from '../types';

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('users')
    .select('id, agency_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.agency_id) throw new Error('No agency');
  return {
    supabase,
    userId: profile.id,
    agencyId: profile.agency_id,
    dbRole: profile.role as DbRole,
  };
}

export async function createApprovalAction(data: {
  agencyId: string;
  title: string;
  client_id?: string | null;
  visa_subclass?: string | null;
  matter_type_id?: string | null;
  matter_reference?: string | null;
  priority?: string;
  notes?: string | null;
  internal_notes?: string | null;
  lodgement_deadline?: string | null;
}) {
  const ctx = await getContext();
  if (ctx.agencyId !== data.agencyId) throw new Error('Agency mismatch');
  const service = new ApprovalService(ctx.supabase);
  return service.createApproval(ctx.agencyId, ctx.userId, ctx.dbRole, data);
}

export async function transitionApprovalAction(
  approvalId: string,
  action: ApprovalAction,
  payload?: { comment?: string; assigned_reviewer_id?: string; assigned_rma_id?: string },
) {
  const ctx = await getContext();
  const service = new ApprovalService(ctx.supabase);
  return service.transition(ctx.agencyId, ctx.userId, ctx.dbRole, approvalId, action, payload);
}

export async function addApprovalCommentAction(
  approvalId: string,
  content: string,
  options?: { visibility?: 'internal' | 'client_visible'; parent_id?: string },
) {
  const ctx = await getContext();
  const service = new ApprovalService(ctx.supabase);
  return service.addComment(ctx.agencyId, ctx.userId, ctx.dbRole, approvalId, content, options);
}

export async function toggleChecklistAction(
  approvalId: string,
  itemId: string,
  isCompleted: boolean,
) {
  const ctx = await getContext();
  const service = new ApprovalService(ctx.supabase);
  return service.toggleChecklistItem(
    ctx.agencyId,
    ctx.userId,
    ctx.dbRole,
    approvalId,
    itemId,
    isCompleted,
  );
}

/** @deprecated Client portal deferred — kept for /review/[token] only */
export async function sendApprovalForReviewAction(
  agencyId: string,
  userId: string,
  role: string,
  approvalId: string,
) {
  const dbRole = uiRoleToDb(role);
  const supabase = await createClient();
  const service = new ApprovalService(supabase);
  return service.transition(agencyId, userId, dbRole, approvalId, 'submit');
}
