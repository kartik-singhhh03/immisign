import type { AgreementWizardFormData } from '../types/wizard'

export type MatterFieldKey = keyof AgreementWizardFormData

export type MatterFieldDef = {
  key: MatterFieldKey
  label: string
  type?: 'text' | 'email' | 'date' | 'textarea'
  placeholder?: string
  required?: boolean
  colSpan?: 1 | 2
}

export type MatterTypeConfig = {
  id: string
  label: string
  defaultSubclassPlaceholder?: string
  showSecondaryApplicant?: boolean
  showSponsor?: boolean
  showDependants?: boolean
  extraFields?: MatterFieldDef[]
}

/** Canonical ImmiMate matter types — must match original product list exactly */
export const IMMIMATE_MATTER_TYPES: MatterTypeConfig[] = [
  {
    id: 'partner_visa',
    label: 'Partner Visa (Onshore/Offshore)',
    defaultSubclassPlaceholder: 'e.g. 820, 801, 309, 100',
    showSecondaryApplicant: true,
    showSponsor: true,
    showDependants: true,
    extraFields: [
      { key: 'relationshipStatus', label: 'Relationship Status', placeholder: 'e.g. De facto, Married' },
      { key: 'relationshipStartDate', label: 'Relationship Start Date', type: 'date' },
    ],
  },
  {
    id: 'skilled_migration',
    label: 'Skilled Migration',
    defaultSubclassPlaceholder: 'e.g. 189, 190, 491',
    showDependants: true,
    extraFields: [
      { key: 'nominatedOccupation', label: 'Nominated Occupation (ANZSCO)', placeholder: 'e.g. 261313' },
      { key: 'skillsAssessmentBody', label: 'Skills Assessment Body', placeholder: 'e.g. ACS, VETASSESS' },
    ],
  },
  {
    id: 'employer_sponsored',
    label: 'Employer Sponsored',
    defaultSubclassPlaceholder: 'e.g. 482, 186, 494',
    showSponsor: true,
    showDependants: true,
    extraFields: [
      { key: 'employerName', label: 'Sponsoring Employer', placeholder: 'Legal entity name' },
      { key: 'nominatedPosition', label: 'Nominated Position', placeholder: 'Job title' },
    ],
  },
  {
    id: 'parent_visa',
    label: 'Parent Visa',
    defaultSubclassPlaceholder: 'e.g. 143, 864, 804',
    showSponsor: true,
    showDependants: false,
    extraFields: [
      { key: 'parentApplicantName', label: 'Parent Applicant Name' },
      { key: 'balanceOfFamilyDetails', label: 'Balance of Family Test Details', type: 'textarea', colSpan: 2 },
    ],
  },
  {
    id: 'student_visa',
    label: 'Student Visa',
    defaultSubclassPlaceholder: 'e.g. 500, 590',
    showDependants: true,
    extraFields: [
      { key: 'institutionName', label: 'Education Provider / Institution' },
      { key: 'courseName', label: 'Course Name' },
      { key: 'coeNumber', label: 'CoE / Confirmation Number', placeholder: 'e.g. CoE123456' },
    ],
  },
  {
    id: 'visitor_visa',
    label: 'Visitor Visa',
    defaultSubclassPlaceholder: 'e.g. 600, 651',
    showSponsor: true,
    extraFields: [
      { key: 'visitPurpose', label: 'Purpose of Visit', placeholder: 'e.g. Tourism, Family visit' },
      { key: 'intendedStayDuration', label: 'Intended Stay Duration', placeholder: 'e.g. 3 months' },
    ],
  },
  {
    id: 'bridging_visa',
    label: 'Bridging Visa',
    defaultSubclassPlaceholder: 'e.g. 010, 050, BVA',
    extraFields: [
      { key: 'substantiveVisaHeld', label: 'Substantive Visa Held / Applied For' },
      { key: 'bridgingGrounds', label: 'Bridging Grounds', type: 'textarea', colSpan: 2 },
    ],
  },
  {
    id: 'aged_dependent_relative',
    label: 'Aged Dependent Relative',
    defaultSubclassPlaceholder: 'e.g. 838, 114',
    showSponsor: true,
    extraFields: [
      { key: 'sponsorRelationship', label: 'Sponsor Relationship to Applicant', placeholder: 'e.g. Sibling, Parent' },
    ],
  },
  {
    id: 'art_appeal',
    label: 'ART Appeal / Merits Review',
    defaultSubclassPlaceholder: 'e.g. ART review',
    extraFields: [
      { key: 'artApplicationNumber', label: 'ART / Tribunal Application Number' },
      { key: 'decisionDate', label: 'Original Decision Date', type: 'date' },
      { key: 'appealGroundsSummary', label: 'Appeal Grounds Summary', type: 'textarea', colSpan: 2 },
    ],
  },
  {
    id: 'character_health_waiver',
    label: 'Character / Health Waiver',
    defaultSubclassPlaceholder: 'e.g. s501, PIC 4007',
    extraFields: [
      { key: 'waiverType', label: 'Waiver Type', placeholder: 'Character / Health / Both' },
      { key: 'waiverGroundsSummary', label: 'Waiver Grounds Summary', type: 'textarea', colSpan: 2 },
    ],
  },
]

export const MATTER_TYPE_OPTIONS = IMMIMATE_MATTER_TYPES.map((m) => m.label)

export function getMatterConfig(matterTypeLabel: string): MatterTypeConfig | undefined {
  return IMMIMATE_MATTER_TYPES.find((m) => m.label === matterTypeLabel)
}

export const RESPONSIBLE_AGENT_ROLES = ['owner', 'migration_agent', 'agent'] as const

export function formatResponsibleAgentRole(role: string): string {
  if (role === 'owner') return 'Owner'
  if (role === 'migration_agent') return 'Migration Agent'
  if (role === 'agent') return 'Agent'
  return role
}
