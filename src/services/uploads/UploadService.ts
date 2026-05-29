import { ApprovalDocument } from "@/types/approval-domain"
import { ApprovalRepository } from "@/repositories/interfaces/ApprovalRepository"

export class UploadService {
  constructor(private readonly repository: ApprovalRepository) {}

  async addDocument(approvalId: string, agencyId: string, data: Omit<ApprovalDocument, "id" | "agency_id" | "approval_id" | "created_at" | "updated_at">): Promise<ApprovalDocument> {
    const newDoc: ApprovalDocument = {
      ...data,
      id: `doc-${Date.now()}`,
      agency_id: agencyId,
      approval_id: approvalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    await this.repository.addDocument(approvalId, agencyId, newDoc)
    return newDoc
  }

  async removeDocument(documentId: string, approvalId: string, agencyId: string): Promise<void> {
    await this.repository.removeDocument(documentId, approvalId, agencyId)
  }
}
