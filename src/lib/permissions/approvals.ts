import { User } from "@/store/authStore"

export const ApprovalPermissions = {
  canViewAllApprovals(role: User["role"]): boolean {
    return ["Owner", "Admin"].includes(role)
  },

  canCreateApproval(role: User["role"]): boolean {
    return ["Owner", "Admin", "Migration Agent", "Case Manager"].includes(role)
  },

  canUploadDocuments(role: User["role"]): boolean {
    return ["Owner", "Admin", "Migration Agent", "Case Manager", "Assistant"].includes(role)
  },

  canSendForReview(role: User["role"]): boolean {
    return ["Owner", "Admin", "Migration Agent", "Case Manager"].includes(role) // Assistant cannot send
  },

  canViewInternalNotes(role: User["role"]): boolean {
    return ["Owner", "Admin", "Migration Agent", "Case Manager", "Assistant", "Read-only staff"].includes(role) // Client cannot see
  },

  canApproveLodgement(role: User["role"], isAssignedClient: boolean): boolean {
    // Only the client can approve their own application, or an Owner overriding
    return isAssignedClient || role === "Owner"
  },
  
  canDeleteApproval(role: User["role"]): boolean {
    return ["Owner", "Admin"].includes(role)
  }
}
