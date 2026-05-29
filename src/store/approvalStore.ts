import { create } from "zustand"
import { ApplicationApproval, ApprovalStatus, ApprovalDocument, ApprovalChecklist, ApprovalAuditEvent } from "@/types/approval-domain"
import { MockApprovalRepository } from "@/repositories/mock/MockApprovalRepository"
import { ApprovalService } from "@/services/approvals/ApprovalService"
import { UploadService } from "@/services/uploads/UploadService"
import { AuditService } from "@/services/audit/AuditService"

// Initialize services
const repository = new MockApprovalRepository()
const approvalService = new ApprovalService(repository)
const auditService = new AuditService(repository)
const uploadService = new UploadService(repository)

interface ApprovalState {
  approvals: ApplicationApproval[]
  activeApproval: ApplicationApproval | null
  isLoading: boolean
  
  // Actions
  fetchApprovals: (agencyId: string) => Promise<void>
  fetchApprovalById: (id: string, agencyId: string) => Promise<void>
  createApproval: (agencyId: string, data: any) => Promise<ApplicationApproval>
  updateApprovalStatus: (id: string, agencyId: string, status: ApprovalStatus, actorId: string) => Promise<void>
  addDocument: (approvalId: string, agencyId: string, document: any) => Promise<void>
  completeVerification: (approvalId: string, checklistId: string, agencyId: string) => Promise<void>
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  activeApproval: null,
  isLoading: false,
  
  fetchApprovals: async (agencyId: string) => {
    set({ isLoading: true })
    const approvals = await approvalService.getApprovalsByAgency(agencyId)
    set({ approvals, isLoading: false })
  },
  
  fetchApprovalById: async (id: string, agencyId: string) => {
    set({ isLoading: true })
    const approval = await approvalService.getApprovalById(id, agencyId)
    set({ activeApproval: approval, isLoading: false })
  },
  
  createApproval: async (agencyId: string, data: any) => {
    const newApproval = await approvalService.createApproval({
      ...data,
      agency_id: agencyId,
      agent_id: "system", // Would come from auth context
    })
    set(state => ({ approvals: [newApproval, ...state.approvals] }))
    return newApproval
  },
  
  updateApprovalStatus: async (id: string, agencyId: string, status: ApprovalStatus, actorId: string) => {
    const updated = await approvalService.updateStatus(id, agencyId, status, actorId)
    set(state => ({
      approvals: state.approvals.map(a => a.id === id ? updated : a),
      activeApproval: state.activeApproval?.id === id ? updated : state.activeApproval
    }))
  },

  addDocument: async (approvalId: string, agencyId: string, documentData: any) => {
    const doc = await uploadService.addDocument(approvalId, agencyId, documentData)
    // Refetch or update local
    await get().fetchApprovalById(approvalId, agencyId)
    await get().fetchApprovals(agencyId)
  },

  completeVerification: async (approvalId: string, checklistId: string, agencyId: string) => {
    await approvalService.completeVerification(approvalId, checklistId, agencyId)
    await get().fetchApprovalById(approvalId, agencyId)
    await get().fetchApprovals(agencyId)
  }
}))
