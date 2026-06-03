import { User } from "@/store/authStore"
import { uiRoleToDb, type DbRole } from "@/lib/auth/db-roles"
import {
  canCreateApproval,
  canEditApprovalDraft,
  canPerformApprovalAction,
  canViewApproval,
} from "@/lib/permissions/approval-actions"
import type { ApplicationApproval, ApprovalAction } from "@/features/approvals/types"

export const ApprovalPermissions = {
  canViewAllApprovals(role: User["role"]): boolean {
    const db = uiRoleToDb(role)
    return ["owner", "admin", "manager", "viewer", "reviewer"].includes(db)
  },

  canCreateApproval(role: User["role"]): boolean {
    return canCreateApproval(uiRoleToDb(role))
  },

  canUploadDocuments(role: User["role"]): boolean {
    const db = uiRoleToDb(role)
    return ["owner", "admin", "manager", "agent", "support"].includes(db)
  },

  canSendForReview(role: User["role"]): boolean {
    const db = uiRoleToDb(role)
    return ["owner", "admin", "manager", "agent"].includes(db)
  },

  canViewInternalNotes(role: User["role"]): boolean {
    const db = uiRoleToDb(role)
    return db !== "viewer" && db !== "reviewer"
  },

  canPerformAction(
    role: User["role"],
    action: ApprovalAction,
    approval: ApplicationApproval,
    userId: string,
  ): boolean {
    return canPerformApprovalAction(uiRoleToDb(role), action, approval, userId)
  },

  canEditDraft(role: User["role"], approval: ApplicationApproval, userId: string): boolean {
    return canEditApprovalDraft(uiRoleToDb(role), approval, userId)
  },

  canView(role: User["role"], approval: ApplicationApproval, userId: string): boolean {
    return canViewApproval(uiRoleToDb(role), approval, userId)
  },

  canDeleteApproval(role: User["role"]): boolean {
    const db = uiRoleToDb(role)
    return db === "owner" || db === "admin"
  },
}
