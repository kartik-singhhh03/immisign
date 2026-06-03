import type { DbRole } from '@/lib/auth/db-roles';
import type { ApprovalAction } from '@/features/approvals/types';
import type { ApplicationApproval } from '@/features/approvals/types';

export function canPerformApprovalAction(
  dbRole: DbRole,
  action: ApprovalAction,
  approval: ApplicationApproval,
  userId: string,
): boolean {
  const isOwnerAdmin = dbRole === 'owner' || dbRole === 'admin';
  const isManager = dbRole === 'manager';
  const isAgent = dbRole === 'agent';
  const isSupport = dbRole === 'support';
  const isViewer = dbRole === 'viewer' || dbRole === 'reviewer';
  const isCreator = approval.created_by === userId;
  const isReviewer = approval.assigned_reviewer_id === userId;

  if (isViewer) return false;

  switch (action) {
    case 'submit':
    case 'resubmit':
      return isOwnerAdmin || isManager || (isAgent && isCreator);
    case 'start_review':
    case 'request_changes':
      return isOwnerAdmin || isManager || isReviewer;
    case 'approve':
    case 'reject':
      return isOwnerAdmin || isManager;
    case 'ready_to_lodge':
    case 'lodged':
    case 'close':
      return dbRole === 'owner';
    case 'assign_reviewer':
      return isOwnerAdmin || isManager;
    case 'assign_rma':
      return isOwnerAdmin;
    default:
      return false;
  }
}

export function canCreateApproval(dbRole: DbRole): boolean {
  return ['owner', 'admin', 'manager', 'agent'].includes(dbRole);
}

export function canEditApprovalDraft(
  dbRole: DbRole,
  approval: ApplicationApproval,
  userId: string,
): boolean {
  if (dbRole === 'owner' || dbRole === 'admin') return true;
  if (approval.status !== 'draft') return false;
  return (dbRole === 'manager' || dbRole === 'agent') && approval.created_by === userId;
}

export function canViewApproval(
  dbRole: DbRole,
  approval: ApplicationApproval,
  userId: string,
): boolean {
  if (['owner', 'admin', 'manager', 'viewer', 'reviewer'].includes(dbRole)) return true;
  if (dbRole === 'agent') {
    return approval.created_by === userId || approval.assigned_reviewer_id === userId;
  }
  if (dbRole === 'support') {
    return approval.assigned_reviewer_id === userId || approval.created_by === userId;
  }
  return false;
}
