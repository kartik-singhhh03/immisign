export type AgreementFeeItemDraft = {
  id: string
  description: string
  amount: string
  category: string
  dueTrigger: string
  notes: string
  sortOrder: number
}

export type ClientPickerOption = {
  id: string
  name: string
  email: string
  phone?: string | null
}

export type AgreementWizardFormData = {
  // Step 1 — Client
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string

  // Step 2 — Matter
  responsibleRma: string
  matterTypeId: string
  matterType: string
  visaSubclass: string
  primaryApplicantName: string
  primaryApplicantDob: string
  secondaryApplicantName: string
  secondaryApplicantDob: string
  secondaryApplicantEmail: string
  dependant1Name: string
  dependant1Dob: string
  dependant1Email: string
  dependant2Name: string
  dependant2Dob: string
  dependant2Email: string
  dependant3Name: string
  dependant3Dob: string
  dependant3Email: string
  sponsorName: string
  sponsorEmail: string
  fileLodgementRef: string
  agreementDate: string
  matterFieldValues: Record<string, string>

  // Step 3 — Fees (dynamic rows; legacy scalar fields kept for draft migration)
  feeItems: AgreementFeeItemDraft[]
  professionalFee: string
  estimatedDisbursements: string
  paymentSchedule: string

  // Step 4 — Terms
  scopeOfServices: string
  specialTerms: string
  selectedClauseIds: string[]

  // Step 6 — Send
  emailMessage: string
  ccMe: boolean
  autoRemind7Days: boolean
  emailOnComplete: boolean
}

export type AgencyBranding = {
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  agreementRefPrefix?: string
  agreementRefStart?: number
  agreementHeaderTitle?: string
  agreementFooterText?: string
}

export type AgencyWizardContext = {
  id: string
  name: string
  slug: string
  legalName?: string
  principalName?: string
  address?: string
  abn?: string
  phone?: string
  email?: string
  marn?: string
  branding?: AgencyBranding
}

export type RmaOption = {
  id: string
  name: string
  email: string
  marn?: string
  role?: string
  isDefault?: boolean
}

export type UserWizardContext = {
  id: string
  name: string
  email: string
  marn?: string
}

export function formatAustralianDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function createInitialWizardForm(
  user?: UserWizardContext,
  agency?: AgencyWizardContext,
  settings?: {
    defaults?: { scopeOfServices?: string; specialTerms?: string; professionalFee?: string; paymentSchedule?: string }
    defaultSelectedClauseIds?: string[]
  }
): AgreementWizardFormData {
  const agentName = user?.name || ''
  const agencyName = agency?.name || ''
  const agencyPhone = agency?.phone || ''

  return {
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',

    responsibleRma: '',
    matterTypeId: '',
    matterType: '',
    visaSubclass: '',
    primaryApplicantName: '',
    primaryApplicantDob: '',
    secondaryApplicantName: '',
    secondaryApplicantDob: '',
    secondaryApplicantEmail: '',
    dependant1Name: '',
    dependant1Dob: '',
    dependant1Email: '',
    dependant2Name: '',
    dependant2Dob: '',
    dependant2Email: '',
    dependant3Name: '',
    dependant3Dob: '',
    dependant3Email: '',
    sponsorName: '',
    sponsorEmail: '',
    fileLodgementRef: '',
    agreementDate: formatAustralianDate(),
    matterFieldValues: {},

    feeItems: [],
    professionalFee: settings?.defaults?.professionalFee || '',
    estimatedDisbursements: '',
    paymentSchedule: '',

    scopeOfServices: settings?.defaults?.scopeOfServices || '',
    specialTerms: settings?.defaults?.specialTerms || '',
    selectedClauseIds: settings?.defaultSelectedClauseIds || [],

    emailMessage: agentName
      ? `This will take less than 2 minutes to sign on any device.\n\nIf you have any questions please contact us.\n\nKind regards,\n${agentName}\n${agencyName}${agencyPhone ? `\n${agencyPhone}` : ''}`
      : '',
    ccMe: true,
    autoRemind7Days: true,
    emailOnComplete: true,
  }
}

export function generateProvisionalAgreementRef(prefix = 'AGR'): string {
  const year = new Date().getFullYear()
  return `${prefix.toUpperCase().slice(0, 12)}-${year}-DRAFT`
}

/** @deprecated Use generateProvisionalAgreementRef */
export function generateAgreementRef(agencySlug: string): string {
  const slugPrefix = agencySlug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'AGR'
  return generateProvisionalAgreementRef(slugPrefix)
}
