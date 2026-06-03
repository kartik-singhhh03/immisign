export type MatterTypeFieldDef = {
  key: string
  label: string
  fieldType: 'text' | 'email' | 'date' | 'textarea'
  required: boolean
  sortOrder: number
  placeholder?: string
  colSpan: 1 | 2
}

export type MatterTypeConfig = {
  id: string
  name: string
  subclassPlaceholder?: string
  showSecondaryApplicant: boolean
  showSponsor: boolean
  showDependants: boolean
  fields: MatterTypeFieldDef[]
}

export type AgencySettings = {
  agency: {
    id: string
    name: string
    slug: string
    legalName?: string
    principalName?: string
    marn?: string
    email?: string
    phone?: string
    website?: string
    address?: string
    abn?: string
    timezone?: string
  }
  branding: {
    logoUrl?: string
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    emailFooter?: string
    agreementRefPrefix: string
    agreementRefStart: number
    agreementHeaderTitle: string
    agreementFooterText: string
  }
  matterTypes: MatterTypeConfig[]
  paymentSchedules: string[]
  defaults: {
    scopeOfServices: string
    specialTerms: string
    professionalFee: string
    paymentSchedule: string
  }
  clauses: Array<{
    id: string
    title: string
    content: string
    clauseKey?: string
    isMandatory: boolean
    enabledByDefault: boolean
    orderIndex: number
  }>
  rmaTeam: Array<{
    id: string
    userId: string
    name: string
    email: string
    phone?: string
    marn: string
    isDefault: boolean
    status: string
    tier: string
  }>
}
