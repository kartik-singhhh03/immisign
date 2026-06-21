import type { Role } from '@/features/auth/types/roles';

export type AgreementSigningSendContext = {
  agencyId: string;
  userId: string;
  role: Role;
  agreementId: string;
  /** Wizard dispatch options (email message, CC, reminders) */
  dispatchOptions?: Record<string, unknown>;
};

export type AgreementSigningSendResult = {
  provider: 'native' | 'signwell';
  /** Native: signing portal URL. SignWell: optional hosted URL. */
  signingUrl?: string | null;
  signwellDocumentId?: string | null;
  signingToken?: string | null;
};

export interface AgreementSigningProvider {
  readonly name: 'native' | 'signwell';
  sendForSignature(ctx: AgreementSigningSendContext): Promise<AgreementSigningSendResult>;
}
