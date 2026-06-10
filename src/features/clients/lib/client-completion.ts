/**
 * Matter completion is computed per matter unit — never client-wide.
 * Complete when all four gates are met for that matter's scoped records.
 */

export type ClientWorkflowSignals = {
  hasSignedServiceAgreement: boolean;
  hasClientSignedApproval: boolean;
  hasLodgedApplication: boolean;
  hasAcknowledgedStatementOfService: boolean;
};

export type CompletionGate = {
  id: 'service_agreement' | 'approval_signed' | 'lodgement' | 'statement_of_service';
  label: string;
  met: boolean;
};

export function deriveCompletionGates(signals: ClientWorkflowSignals): CompletionGate[] {
  return [
    {
      id: 'service_agreement',
      label: 'Signed Service Agreement',
      met: signals.hasSignedServiceAgreement,
    },
    {
      id: 'approval_signed',
      label: 'Application approval signed',
      met: signals.hasClientSignedApproval,
    },
    {
      id: 'lodgement',
      label: 'Application lodged',
      met: signals.hasLodgedApplication,
    },
    {
      id: 'statement_of_service',
      label: 'Statement of Service acknowledged',
      met: signals.hasAcknowledgedStatementOfService,
    },
  ];
}

export function isMatterComplete(signals: ClientWorkflowSignals): boolean {
  return (
    signals.hasSignedServiceAgreement &&
    signals.hasClientSignedApproval &&
    signals.hasLodgedApplication &&
    signals.hasAcknowledgedStatementOfService
  );
}

/** @deprecated Prefer isMatterComplete — name retained for existing imports. */
export const isClientComplete = isMatterComplete;

/** Pass only matter-scoped record subsets — never entire client arrays. */
export function computeSignalsFromRecords(input: {
  agreements: Array<{ status?: string | null; completed_at?: string | null }>;
  approvals: Array<{ status?: string | null; lodged_at?: string | null; client_signed_at?: string | null }>;
  serviceStatements: Array<{ acknowledged_at?: string | null; status?: string | null }>;
}): ClientWorkflowSignals {
  const hasSignedServiceAgreement = input.agreements.some(
    (a) =>
      a.status === 'signed' ||
      a.status === 'completed' ||
      Boolean(a.completed_at),
  );

  const hasClientSignedApproval = input.approvals.some(
    (a) => Boolean(a.client_signed_at),
  );

  const hasLodgedApplication = input.approvals.some(
    (a) => a.status === 'lodged' || Boolean(a.lodged_at),
  );

  const hasAcknowledgedStatementOfService = input.serviceStatements.some(
    (s) => Boolean(s.acknowledged_at) || s.status === 'acknowledged',
  );

  return {
    hasSignedServiceAgreement,
    hasClientSignedApproval,
    hasLodgedApplication,
    hasAcknowledgedStatementOfService,
  };
}
