export type OnboardingPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PrimaryApplicantInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  address: string;
};

export type SecondaryApplicantInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
};

export type MatterDetailsInput = {
  matterTypeId: string;
  visaSubclass: string;
  visaStream: string;
  assignedAgentId: string;
  priority: OnboardingPriority;
};

export type FinancialSetupInput = {
  professionalFee: number;
  deposit: number;
  visaFees: number;
};

export type OnboardingCompletePayload = {
  primary: PrimaryApplicantInput;
  hasSecondary: boolean;
  secondary?: SecondaryApplicantInput | null;
  matter: MatterDetailsInput;
  financial: FinancialSetupInput;
};

export type OnboardingCompleteResult = {
  clientId: string;
  clientNumber: string;
  matterId: string;
  agreementId: string;
  approvalId: string;
  deepLink: string;
  agreementPdfGenerated?: boolean;
};

export type AssignableAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
};
