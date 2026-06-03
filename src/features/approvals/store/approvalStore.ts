import { create } from "zustand"
import { createClient } from "@/lib/supabase/client"
import { ApprovalRepository } from "@/features/approvals/repositories/approvals.repository"
import { ApprovalStatus } from "@/features/approvals/types"
import { useAuthStore } from "@/store/authStore"

function getRepository() {
  return new ApprovalRepository(createClient())
}

interface ApprovalState {
  createApproval: (agencyId: string, data: Record<string, unknown>) => Promise<void>
  addDocument: (approvalId: string, agencyId: string, documentData: { document_path: string }) => Promise<void>
}

export const useApprovalStore = create<ApprovalState>(() => ({
  createApproval: async (agencyId, data) => {
    const { user } = useAuthStore.getState()
    if (!user?.id) throw new Error("Authentication required")

    const repo = getRepository()
    await repo.create({
      agency_id: agencyId,
      created_by: user.id,
      title: String(data.title || "New Application Approval"),
      visa_subclass: String(data.visaSubclass || data.visa_subclass || ""),
      status: ApprovalStatus.DRAFT,
      review_token: crypto.randomUUID(),
    })
  },

  addDocument: async (approvalId, agencyId, documentData) => {
    const repo = getRepository()
    const approval = await repo.getById(approvalId)
    if (!approval || approval.agency_id !== agencyId) {
      throw new Error("Approval not found")
    }
    await repo.update(approvalId, {
      document_path: documentData.document_path,
      version_number: (approval.version_number || 1) + 1,
    })
  },
}))
