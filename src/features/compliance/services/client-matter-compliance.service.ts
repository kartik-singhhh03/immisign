import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientFileSource } from '@/features/file-notes/services/client-files.service';
import { ClientFilesService } from '@/features/file-notes/services/client-files.service';
import {
  deriveMatterStatus,
  resolveMatterScopeFromFile,
  type MatterAgreementRecord,
  type MatterApprovalRecord,
  type MatterStatementRecord,
} from '@/features/clients/lib/matter-scope';

export type MatterComplianceGate = {
  id: string;
  label: string;
  met: boolean;
};

export type ClientMatterComplianceResult = {
  client_id: string;
  matter_id: string | null;
  file_id: string;
  file_source: ClientFileSource;
  compliance_score: number;
  compliance_status: string;
  completion_gates: MatterComplianceGate[];
};

function computeScore(gates: MatterComplianceGate[]): number {
  if (!gates.length) return 0;
  const met = gates.filter((g) => g.met).length;
  return Math.round((met / gates.length) * 100);
}

export async function getClientMatterCompliance(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  fileSource: ClientFileSource,
  fileId: string,
): Promise<ClientMatterComplianceResult> {
  const filesService = new ClientFilesService(supabase);
  const allFiles = await filesService.listClientFiles(agencyId, clientId, { activeOnly: true });
  const selectedMatter = allFiles.find((f) => f.source === fileSource && f.id === fileId);
  if (!selectedMatter) {
    throw new Error('Matter not found for this client');
  }

  const [agRes, apRes, sosRes] = await Promise.all([
    supabase
      .from('agreements')
      .select(
        'id, agreement_number, status, completed_at, sent_at, matter_id, matter_type_id, metadata, created_at',
      )
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .neq('status', 'cancelled'),
    supabase
      .from('application_approvals')
      .select(
        'id, approval_number, status, visa_subclass, matter_id, client_sent_at, client_signed_at, lodged_at, created_at',
      )
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null),
    supabase
      .from('service_statements')
      .select('id, agreement_id, approval_id, status, acknowledged_at, sent_at, created_at')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null),
  ]);

  const agreements = (agRes.data || []) as MatterAgreementRecord[];
  const approvals = (apRes.data || []) as MatterApprovalRecord[];
  const statements = (sosRes.data || []) as MatterStatementRecord[];

  const scope = resolveMatterScopeFromFile(selectedMatter, agreements, approvals, statements);
  if (!scope) {
    throw new Error('Could not resolve matter scope');
  }

  const matterId =
    (scope.approval as { matter_id?: string } | null)?.matter_id ??
    (scope.agreement as { matter_id?: string } | null)?.matter_id ??
    null;

  const completion_gates: MatterComplianceGate[] = scope.gates.map((g) => ({
    id: g.id,
    label: g.label,
    met: g.met,
  }));

  return {
    client_id: clientId,
    matter_id: matterId,
    file_id: fileId,
    file_source: fileSource,
    compliance_score: computeScore(completion_gates),
    compliance_status: deriveMatterStatus(scope),
    completion_gates,
  };
}
