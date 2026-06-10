import {
  computeSignalsFromRecords,
  isClientComplete,
  type ClientWorkflowSignals,
} from '@/features/clients/lib/client-completion';

export type ClientRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
};

export type AgreementRecord = {
  id: string;
  client_id: string;
  agreement_number?: string | null;
  matter_type_id?: string | null;
  status?: string | null;
  completed_at?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: unknown;
  created_by?: string | null;
};

export type ApprovalRecord = {
  id: string;
  client_id: string | null;
  approval_number?: string | null;
  status?: string | null;
  visa_subclass?: string | null;
  matter_type_id?: string | null;
  priority?: string | null;
  client_sent_at?: string | null;
  client_signed_at?: string | null;
  lodged_at?: string | null;
  lodgement_deadline?: string | null;
  certificate_storage_path?: string | null;
  certificate_generated_at?: string | null;
  assigned_rma_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ServiceStatementRecord = {
  id: string;
  client_id: string;
  agreement_id?: string | null;
  approval_id?: string | null;
  status?: string | null;
  acknowledged_at?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

function isSignedAgreement(a: AgreementRecord): boolean {
  return (
    a.status === 'signed' ||
    a.status === 'completed' ||
    Boolean(a.completed_at)
  );
}

function isUnsignedAgreement(a: AgreementRecord): boolean {
  return !isSignedAgreement(a) && a.status !== 'cancelled';
}

export function buildClientSignals(
  clientId: string,
  agreements: AgreementRecord[],
  approvals: ApprovalRecord[],
  statements: ServiceStatementRecord[],
): ClientWorkflowSignals {
  return computeSignalsFromRecords({
    agreements: agreements.filter((a) => a.client_id === clientId),
    approvals: approvals.filter((a) => a.client_id === clientId),
    serviceStatements: statements.filter((s) => s.client_id === clientId),
  });
}

export function clientHasSignedAgreement(
  clientId: string,
  agreements: AgreementRecord[],
): boolean {
  return agreements
    .filter((a) => a.client_id === clientId)
    .some(isSignedAgreement);
}

export function clientMissingServiceAgreement(
  clientId: string,
  agreements: AgreementRecord[],
): boolean {
  const clientAgreements = agreements.filter((a) => a.client_id === clientId);
  if (clientAgreements.length === 0) return true;
  return !clientAgreements.some(isSignedAgreement);
}

export function clientPendingApprovalSignoff(
  clientId: string,
  approvals: ApprovalRecord[],
): boolean {
  return approvals
    .filter((a) => a.client_id === clientId)
    .some(
      (a) =>
        Boolean(a.client_sent_at) &&
        !a.client_signed_at &&
        !['closed', 'rejected', 'lodged'].includes(a.status || ''),
    );
}

export function clientUnacknowledgedSos(
  clientId: string,
  statements: ServiceStatementRecord[],
): boolean {
  return statements
    .filter((s) => s.client_id === clientId)
    .some(
      (s) =>
        (s.status === 'sent' || s.status === 'viewed') &&
        !s.acknowledged_at &&
        s.status !== 'acknowledged',
    );
}

export function clientReadyToLodge(
  clientId: string,
  approvals: ApprovalRecord[],
): boolean {
  return approvals
    .filter((a) => a.client_id === clientId)
    .some(
      (a) =>
        a.status === 'ready_to_lodge' ||
        (Boolean(a.client_signed_at) &&
          a.status === 'approved' &&
          !a.lodged_at &&
          a.status !== 'lodged'),
    );
}

export function clientIsComplete(
  clientId: string,
  agreements: AgreementRecord[],
  approvals: ApprovalRecord[],
  statements: ServiceStatementRecord[],
): boolean {
  return isClientComplete(
    buildClientSignals(clientId, agreements, approvals, statements),
  );
}

export function resolveClientVisaSubclass(
  clientId: string,
  approvals: ApprovalRecord[],
  agreements: AgreementRecord[],
): string | null {
  const approval = approvals.find((a) => a.client_id === clientId && a.visa_subclass);
  if (approval?.visa_subclass) return approval.visa_subclass;
  const agreement = agreements.find((a) => a.client_id === clientId);
  if (!agreement?.metadata || typeof agreement.metadata !== 'object') return null;
  const m = agreement.metadata as Record<string, unknown>;
  const raw =
    (m.visaSubclass as string) ||
    (m.visa_subclass as string) ||
    null;
  return raw?.trim() || null;
}

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function clientWorkflowStage(
  clientId: string,
  agreements: AgreementRecord[],
  approvals: ApprovalRecord[],
  statements: ServiceStatementRecord[],
): string {
  if (clientIsComplete(clientId, agreements, approvals, statements)) {
    return 'Completed';
  }
  const signals = buildClientSignals(clientId, agreements, approvals, statements);
  if (signals.hasAcknowledgedStatementOfService) return 'SOS Acknowledged';
  if (statements.some((s) => s.client_id === clientId && (s.sent_at || s.status === 'sent' || s.status === 'viewed'))) {
    return 'SOS Sent';
  }
  if (signals.hasLodgedApplication) return 'Lodged';
  if (signals.hasClientSignedApproval) return 'Approval Signed';
  if (approvals.some((a) => a.client_id === clientId && a.client_sent_at)) {
    return 'Approval Sent';
  }
  if (
    approvals.some((a) =>
      a.client_id === clientId &&
      !['closed', 'rejected', 'lodged'].includes(a.status || ''),
    )
  ) {
    return 'Preparation';
  }
  if (signals.hasSignedServiceAgreement) return 'Service Agreement Signed';
  return 'Onboarding';
}
