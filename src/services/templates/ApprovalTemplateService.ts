import { ApprovalTemplate } from "@/types/approval-domain"

export class ApprovalTemplateService {
  private templates: ApprovalTemplate[] = [
    {
      id: "tpl-820",
      agency_id: "w-avc",
      name: "Partner Visa Standard Requirements",
      description: "Default checklist for subclass 820/801",
      visaSubclass: "820",
      defaultChecklist: [
        { label: "Confirm all passport details are correct", type: "data_check", isRequired: true, isCompleted: false },
        { label: "Confirm relationship history timeline is accurate", type: "data_check", isRequired: true, isCompleted: false },
        { label: "Authorize migration agent to lodge application", type: "declaration", isRequired: true, isCompleted: false }
      ],
      created_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  async getTemplatesBySubclass(agencyId: string, subclass: string): Promise<ApprovalTemplate[]> {
    // In a real DB, query by agency_id and visaSubclass
    return this.templates.filter(t => t.agency_id === agencyId && t.visaSubclass === subclass)
  }

  async getAllTemplates(agencyId: string): Promise<ApprovalTemplate[]> {
    return this.templates.filter(t => t.agency_id === agencyId)
  }

  async getTemplateById(id: string, agencyId: string): Promise<ApprovalTemplate | null> {
    return this.templates.find(t => t.id === id && t.agency_id === agencyId) || null
  }
}
