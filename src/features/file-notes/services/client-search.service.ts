import type { SupabaseClient } from '@supabase/supabase-js';
import { filterProductionClients, isDemoClientRecord } from '@/lib/data/production-filters';
import {
  buildMatterClientPath,
  deriveMatterCurrentStage,
  deriveMatterStatus,
  groupFilesIntoMatterUnits,
  resolveMatterScope,
  type MatterAgreementRecord,
  type MatterApprovalRecord,
  type MatterStatementRecord,
} from '@/features/clients/lib/matter-scope';
import { ClientFilesService, type ClientFile } from './client-files.service';

export type MatterSearchMatch = {
  file_source: 'agreement' | 'application_approval';
  file_id: string;
  file_number: string;
  visa_subclass?: string | null;
  is_complete?: boolean;
};

/** One actionable matter row in search results. */
export type MatterSearchResult = {
  clientId: string;
  clientName: string;
  clientEmail: string;
  fileId: string;
  fileSource: 'agreement' | 'application_approval';
  fileNumber: string;
  matterType: string | null;
  visaSubclass: string | null;
  stage: string;
  compliance: {
    completed: number;
    total: number;
    scorePercent: number;
  };
  assignedAgent: string | null;
  deepLink: string;
};

export type ClientSearchRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  client_number?: string | null;
  active_file_count: number;
  matter_match?: MatterSearchMatch | null;
  matters?: MatterSearchResult[];
};

function normalizeQ(q: string): string {
  return q.trim().toLowerCase();
}

function groupByClientId<T extends { client_id?: string | null }>(
  rows: T[],
  key: keyof T,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = row[key] as string | null | undefined;
    if (!id) continue;
    const list = map.get(id) || [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

export class ClientSearchService {
  constructor(private supabase: SupabaseClient) {}

  async search(
    agencyId: string,
    query: string,
    workspaceSlug: string,
    limit = 12,
  ): Promise<{ matters: MatterSearchResult[]; clients: ClientSearchRow[] }> {
    const matters = await this.searchMatters(agencyId, query, workspaceSlug, limit);

    const byClient = new Map<string, ClientSearchRow>();
    for (const m of matters) {
      if (!byClient.has(m.clientId)) {
        byClient.set(m.clientId, {
          id: m.clientId,
          name: m.clientName,
          email: m.clientEmail,
          active_file_count: 0,
          matters: [],
        });
      }
      const row = byClient.get(m.clientId)!;
      row.matters!.push(m);
      row.matter_match = row.matter_match || {
        file_source: m.fileSource,
        file_id: m.fileId,
        file_number: m.fileNumber,
        visa_subclass: m.visaSubclass,
      };
    }

    const filesService = new ClientFilesService(this.supabase);
    const counts = await filesService.countActiveFilesForClients(
      agencyId,
      [...byClient.keys()],
    );

    const clients = [...byClient.values()].map((c) => ({
      ...c,
      active_file_count: counts[c.id] ?? c.matters?.length ?? 0,
    }));

    return { matters, clients };
  }

  async searchMatters(
    agencyId: string,
    query: string,
    workspaceSlug: string,
    limit = 20,
  ): Promise<MatterSearchResult[]> {
    const q = query.trim();
    if (q.length < 1) return [];

    const nq = normalizeQ(q);
    const pattern = `%${q}%`;
    const clientIds = new Set<string>();
    const directFileKeys = new Set<string>();

    const { data: directClients } = await this.supabase
      .from('clients')
      .select('id, name, email, phone, client_number')
      .eq('agency_id', agencyId)
      .or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},client_number.ilike.${pattern}`,
      )
      .limit(20);

    for (const c of filterProductionClients(directClients || [])) {
      clientIds.add(c.id);
    }

    const { data: byAgreement } = await this.supabase
      .from('agreements')
      .select('id, client_id, agreement_number, metadata, matter_type_id')
      .eq('agency_id', agencyId)
      .or(`agreement_number.ilike.${pattern},title.ilike.${pattern}`)
      .neq('status', 'cancelled')
      .limit(20);

    for (const row of byAgreement || []) {
      if (row.client_id) {
        clientIds.add(row.client_id);
        directFileKeys.add(`agreement:${row.id}`);
      }
    }

    const { data: byApproval } = await this.supabase
      .from('application_approvals')
      .select(
        'id, client_id, approval_number, visa_subclass, title, matter_type_id, assigned_rma_id, created_by',
      )
      .eq('agency_id', agencyId)
      .is('deleted_at', null)
      .or(
        `approval_number.ilike.${pattern},title.ilike.${pattern},visa_subclass.ilike.${pattern}`,
      )
      .limit(20);

    for (const row of byApproval || []) {
      if (row.client_id) {
        clientIds.add(row.client_id);
        directFileKeys.add(`application_approval:${row.id}`);
      }
    }

    const { data: agents } = await this.supabase
      .from('users')
      .select('id, full_name')
      .eq('agency_id', agencyId)
      .ilike('full_name', pattern)
      .limit(10);

    const agentIds = new Set((agents || []).map((u) => u.id));
    const agentNames = new Map((agents || []).map((u) => [u.id, u.full_name || '']));

    if (agentIds.size) {
      const { data: agentApprovals } = await this.supabase
        .from('application_approvals')
        .select('id, client_id')
        .eq('agency_id', agencyId)
        .is('deleted_at', null)
        .or(
          [...agentIds]
            .map((id) => `assigned_rma_id.eq.${id},created_by.eq.${id}`)
            .join(','),
        )
        .limit(30);
      for (const row of agentApprovals || []) {
        if (row.client_id) {
          clientIds.add(row.client_id);
          directFileKeys.add(`application_approval:${row.id}`);
        }
      }
    }

    let matterTypeIds: string[] = [];
    const { data: matterTypes } = await this.supabase
      .from('matter_types')
      .select('id, name')
      .eq('agency_id', agencyId)
      .ilike('name', pattern)
      .limit(10);
    if (matterTypes?.length) {
      matterTypeIds = matterTypes.map((m) => m.id);
      const { data: mtAgreements } = await this.supabase
        .from('agreements')
        .select('id, client_id')
        .eq('agency_id', agencyId)
        .in('matter_type_id', matterTypeIds)
        .limit(20);
      const { data: mtApprovals } = await this.supabase
        .from('application_approvals')
        .select('id, client_id')
        .eq('agency_id', agencyId)
        .in('matter_type_id', matterTypeIds)
        .is('deleted_at', null)
        .limit(20);
      for (const row of mtAgreements || []) {
        if (row.client_id) {
          clientIds.add(row.client_id);
          directFileKeys.add(`agreement:${row.id}`);
        }
      }
      for (const row of mtApprovals || []) {
        if (row.client_id) {
          clientIds.add(row.client_id);
          directFileKeys.add(`application_approval:${row.id}`);
        }
      }
    }

    const clientIdList = [...clientIds].slice(0, 6);
    if (!clientIdList.length) return [];

    const filesService = new ClientFilesService(this.supabase);
    const clientNameMatch = new Set(
      filterProductionClients(directClients || []).map((c) => c.id),
    );

    const [
      { data: allMatterTypes },
      { data: allAgencyUsers },
      { data: clientsBatch },
      agRes,
      apRes,
      sosRes,
      ...filesPerClient
    ] = await Promise.all([
      this.supabase.from('matter_types').select('id, name').eq('agency_id', agencyId),
      this.supabase.from('users').select('id, full_name').eq('agency_id', agencyId),
      this.supabase
        .from('clients')
        .select('id, name, email')
        .eq('agency_id', agencyId)
        .in('id', clientIdList),
      this.supabase
        .from('agreements')
        .select(
          'id, client_id, agreement_number, status, completed_at, sent_at, created_by, matter_type_id, visa_stream, metadata, created_at',
        )
        .eq('agency_id', agencyId)
        .in('client_id', clientIdList)
        .neq('status', 'cancelled'),
      this.supabase
        .from('application_approvals')
        .select(
          'id, client_id, approval_number, title, status, visa_subclass, visa_stream, priority, matter_type_id, assigned_rma_id, assigned_reviewer_id, created_by, client_sent_at, client_signed_at, lodged_at, ready_to_lodge_at, created_at',
        )
        .eq('agency_id', agencyId)
        .in('client_id', clientIdList)
        .is('deleted_at', null),
      this.supabase
        .from('service_statements')
        .select('id, client_id, agreement_id, approval_id, status, acknowledged_at, sent_at, created_at')
        .eq('agency_id', agencyId)
        .in('client_id', clientIdList)
        .is('deleted_at', null),
      ...clientIdList.map((id) => filesService.listClientFiles(agencyId, id, { activeOnly: true })),
    ]);

    const matterTypeNames = new Map([
      ...(matterTypes || []).map((m) => [m.id, m.name] as const),
      ...(allMatterTypes || []).map((m) => [m.id, m.name] as const),
    ]);
    const userNames = new Map([
      ...agentNames.entries(),
      ...(allAgencyUsers || []).map((u) => [u.id, u.full_name || ''] as const),
    ]);

    const clientMap = new Map(
      filterProductionClients(clientsBatch || [])
        .filter((c) => !isDemoClientRecord(c))
        .map((c) => [c.id, c]),
    );
    const agreementsByClient = groupByClientId(agRes.data || [], 'client_id');
    const approvalsByClient = groupByClientId(apRes.data || [], 'client_id');
    const statementsByClient = groupByClientId(sosRes.data || [], 'client_id');

    const results: MatterSearchResult[] = [];

    for (let i = 0; i < clientIdList.length; i++) {
      if (results.length >= limit) break;
      const clientId = clientIdList[i];
      const client = clientMap.get(clientId);
      if (!client) continue;

      const files = filesPerClient[i] as ClientFile[];
      const agreements = (agreementsByClient.get(clientId) || []) as MatterAgreementRecord[];
      const approvals = (approvalsByClient.get(clientId) || []) as MatterApprovalRecord[];
      const statements = (statementsByClient.get(clientId) || []) as MatterStatementRecord[];
      const units = groupFilesIntoMatterUnits(files);

      for (const unit of units) {
        if (results.length >= limit) break;

        const fileKey = `${unit.fileSource}:${unit.fileId}`;
        const file = files.find((f) => f.source === unit.fileSource && f.id === unit.fileId);
        if (!file) continue;

        const scope = resolveMatterScope(unit, agreements, approvals, statements);
        const stage = formatSearchStage(scope);
        const tabStage = deriveMatterCurrentStage(scope);
        const tab = resolveSearchTab(tabStage);

        const matterTypeId =
          scope.approval?.matter_type_id || scope.agreement?.matter_type_id || null;
        const matterType =
          file.matter_label ||
          (matterTypeId ? matterTypeNames.get(matterTypeId) || null : null);

        const assigneeId =
          scope.approval?.assigned_rma_id ||
          scope.approval?.assigned_reviewer_id ||
          scope.approval?.created_by ||
          scope.agreement?.created_by ||
          null;
        const assignedAgent = assigneeId ? userNames.get(assigneeId) || null : null;

        const gates = scope.gates;
        const completed = gates.filter((g) => g.met).length;
        const total = gates.length;
        const scorePercent = total ? Math.round((completed / total) * 100) : 0;

        const visaSubclass =
          file.visa_subclass?.replace(/^SC\s*/i, '') ||
          scope.approval?.visa_subclass ||
          null;

        const matches =
          clientNameMatch.has(clientId) ||
          directFileKeys.has(fileKey) ||
          normalizeQ(file.file_number).includes(nq) ||
          normalizeQ(visaSubclass || '').includes(nq) ||
          normalizeQ(matterType || '').includes(nq) ||
          normalizeQ(stage).includes(nq) ||
          (assigneeId && agentIds.has(assigneeId));

        if (!matches) continue;

        results.push({
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          fileId: unit.fileId,
          fileSource: unit.fileSource,
          fileNumber: unit.fileNumber,
          matterType,
          visaSubclass: visaSubclass ? `SC${visaSubclass}` : null,
          stage,
          compliance: { completed, total, scorePercent },
          assignedAgent,
          deepLink: buildMatterClientPath(
            workspaceSlug,
            client.id,
            unit.fileSource,
            unit.fileId,
            tab,
          ),
        });
      }
    }

    return results;
  }
}

function formatSearchStage(scope: ReturnType<typeof resolveMatterScope>): string {
  const status = deriveMatterStatus(scope);
  const workflow = deriveMatterCurrentStage(scope);
  if (status === 'Lodged') return 'Lodged';
  if (status === 'Awaiting Approval') return 'Awaiting Approval';
  if (workflow === 'Application Preparation') return 'Preparation';
  if (status === 'Pending Client') return 'Awaiting Approval';
  return status;
}

function resolveSearchTab(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('lodgement') || s === 'lodged') return 'lodgement';
  if (s.includes('preparation')) return 'preparation';
  if (s.includes('approval')) return 'approval';
  if (s.includes('statement')) return 'statement_of_service';
  if (s === 'completed') return 'completion';
  if (s.includes('file notes')) return 'file_notes';
  if (s.includes('service agreement')) return 'service_agreement';
  return 'overview';
}
