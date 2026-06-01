/** @deprecated Use real repository from src/features/approvals/repositories instead */
import { ApprovalRepository } from "@/repositories/interfaces/ApprovalRepository"
import { 
  ApplicationApproval, 
  ApprovalStatus, 
  ApprovalDocument, 
  ApprovalChecklist, 
  ApprovalAuditEvent, 
  ApprovalReminder 
} from "@/types/approval-domain"

// Helper to simulate network latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export class MockApprovalRepository implements ApprovalRepository {
  private readonly storageKey = "immisign_approvals_mock"

  private getApprovals(): ApplicationApproval[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(this.storageKey)
    if (!data) {
      this.saveApprovals(this.getSeedData())
      return this.getSeedData()
    }
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  private getSeedData(): ApplicationApproval[] {
    return [
      {
        id: "APP-5021",
        agency_id: "w-avc",
        title: "Partner Visa Lodgement",
        visaSubclass: "Subclass 820/801",
        clientName: "David Sharma",
        clientEmail: "david@email.com",
        agentName: "Rajwant Singh",
        agent_id: "u-owner",
        status: "under_review",
        lodgementDeadline: "2024-06-05T12:00:00.000Z",
        notes: "Please review the Form 47SP and Form 40SP before final sign off.",
        documents: [
          { id: "doc-1", agency_id: "w-avc", approval_id: "APP-5021", name: "Form_47SP_Draft.pdf", size: 1024 * 1024 * 2.5, type: "application/pdf", status: "scanned", url: "/mock-docs/form47sp.pdf", created_by: "u-owner", created_at: "2024-05-26T14:00:00.000Z", updated_at: "2024-05-26T14:00:00.000Z" },
          { id: "doc-2", agency_id: "w-avc", approval_id: "APP-5021", name: "Statutory_Declarations.pdf", size: 1024 * 512, type: "application/pdf", status: "scanned", url: "/mock-docs/statdecs.pdf", created_by: "u-owner", created_at: "2024-05-26T14:00:00.000Z", updated_at: "2024-05-26T14:00:00.000Z" },
        ],
        verificationChecklist: [
          { id: "ver-1", agency_id: "w-avc", approval_id: "APP-5021", label: "I confirm all passport details are correct.", type: "data_check", isRequired: true, isCompleted: true, completedAt: "2024-05-27T12:00:00.000Z", created_at: "2024-05-26T12:00:00.000Z", updated_at: "2024-05-27T12:00:00.000Z" },
          { id: "ver-2", agency_id: "w-avc", approval_id: "APP-5021", label: "I confirm my travel history is complete up to 2026.", type: "confirmation", isRequired: true, isCompleted: false, created_at: "2024-05-26T12:00:00.000Z", updated_at: "2024-05-26T12:00:00.000Z" },
          { id: "ver-3", agency_id: "w-avc", approval_id: "APP-5021", label: "I authorize the migration agent to lodge this application on my behalf.", type: "declaration", isRequired: true, isCompleted: false, created_at: "2024-05-26T12:00:00.000Z", updated_at: "2024-05-26T12:00:00.000Z" },
        ],
        declarations: [],
        auditEvents: [
          { id: "aud-1", agency_id: "w-avc", approval_id: "APP-5021", type: "created", description: "Application approval request created.", actor_id: "u-owner", actor_name: "Rajwant Singh", created_at: "2024-05-26T12:00:00.000Z" },
          { id: "aud-3", agency_id: "w-avc", approval_id: "APP-5021", type: "sent", description: "Sent to client for review.", actor_id: "system", actor_name: "System", created_at: "2024-05-26T18:00:00.000Z" },
        ],
        reminders: [],
        reviewers: [],
        created_by: "u-owner",
        created_at: "2024-05-26T12:00:00.000Z",
        updated_at: "2024-05-26T12:00:00.000Z"
      }
    ]
  }

  private saveApprovals(approvals: ApplicationApproval[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(approvals))
    }
  }

  async findById(id: string, agencyId: string): Promise<ApplicationApproval | null> {
    await delay(300)
    const approvals = this.getApprovals()
    return approvals.find(a => a.id === id && a.agency_id === agencyId) || null
  }

  async findByAgencyId(agencyId: string): Promise<ApplicationApproval[]> {
    await delay(300)
    const approvals = this.getApprovals()
    return approvals.filter(a => a.agency_id === agencyId)
  }

  async create(approval: ApplicationApproval): Promise<ApplicationApproval> {
    await delay(500)
    const approvals = this.getApprovals()
    this.saveApprovals([approval, ...approvals])
    return approval
  }

  async updateStatus(id: string, agencyId: string, status: ApprovalStatus): Promise<ApplicationApproval> {
    await delay(400)
    const approvals = this.getApprovals()
    let updated: ApplicationApproval | null = null
    
    const newApprovals = approvals.map(a => {
      if (a.id === id && a.agency_id === agencyId) {
        updated = { ...a, status, updated_at: new Date().toISOString() }
        return updated
      }
      return a
    })

    if (!updated) throw new Error("Approval not found")
    this.saveApprovals(newApprovals)
    return updated
  }

  async addDocument(approvalId: string, agencyId: string, document: ApprovalDocument): Promise<void> {
    await delay(400)
    const approvals = this.getApprovals()
    const newApprovals = approvals.map(a => {
      if (a.id === approvalId && a.agency_id === agencyId) {
        return { 
          ...a, 
          documents: [...a.documents, document],
          updated_at: new Date().toISOString()
        }
      }
      return a
    })
    this.saveApprovals(newApprovals)
  }

  async removeDocument(documentId: string, approvalId: string, agencyId: string): Promise<void> {
    await delay(400)
    const approvals = this.getApprovals()
    const newApprovals = approvals.map(a => {
      if (a.id === approvalId && a.agency_id === agencyId) {
        return { 
          ...a, 
          documents: a.documents.filter(d => d.id !== documentId),
          updated_at: new Date().toISOString()
        }
      }
      return a
    })
    this.saveApprovals(newApprovals)
  }

  async updateChecklistItem(approvalId: string, checklistId: string, agencyId: string, updates: Partial<ApprovalChecklist>): Promise<void> {
    await delay(200)
    const approvals = this.getApprovals()
    const newApprovals = approvals.map(a => {
      if (a.id === approvalId && a.agency_id === agencyId) {
        return { 
          ...a, 
          verificationChecklist: a.verificationChecklist.map(c => 
            c.id === checklistId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
          ),
          updated_at: new Date().toISOString()
        }
      }
      return a
    })
    this.saveApprovals(newApprovals)
  }

  async addAuditEvent(approvalId: string, agencyId: string, event: ApprovalAuditEvent): Promise<void> {
    await delay(100)
    const approvals = this.getApprovals()
    const newApprovals = approvals.map(a => {
      if (a.id === approvalId && a.agency_id === agencyId) {
        return { 
          ...a, 
          auditEvents: [event, ...a.auditEvents],
          updated_at: new Date().toISOString()
        }
      }
      return a
    })
    this.saveApprovals(newApprovals)
  }

  async addReminder(approvalId: string, agencyId: string, reminder: ApprovalReminder): Promise<void> {
    await delay(100)
    const approvals = this.getApprovals()
    const newApprovals = approvals.map(a => {
      if (a.id === approvalId && a.agency_id === agencyId) {
        return { 
          ...a, 
          reminders: [...a.reminders, reminder],
          updated_at: new Date().toISOString()
        }
      }
      return a
    })
    this.saveApprovals(newApprovals)
  }
}


