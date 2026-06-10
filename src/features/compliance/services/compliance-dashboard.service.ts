import type { SupabaseClient } from '@supabase/supabase-js';
import { filterProductionClients } from '@/lib/data/production-filters';
import {
  buildMatterUnitsFromRecords,
  deriveMatterCurrentStage,
  deriveMatterNextAction,
  matterMissingServiceAgreement,
  matterPendingApprovalSignoff,
  matterReadyToLodge,
  matterUnacknowledgedSos,
  resolveMatterScope,
  type MatterScope,
} from '@/features/clients/lib/matter-scope';
import {
  daysSince,
  type AgreementRecord,
  type ApprovalRecord,
  type ClientRecord,
  type ServiceStatementRecord,
} from '../lib/client-workflow';
import type {
  AttentionQueueRow,
  AttentionUrgency,
  AuditReadiness,
  ComplianceActivityItem,
  ComplianceDashboardPayload,
  ComplianceFilterOptions,
  ComplianceSummaryCard,
  ComplianceTrend,
  MatterRef,
  WorkflowFunnelStage,
} from '../types';

type ScopedMatter = {
  client: ClientRecord;
  scope: MatterScope;
};

function collectScopedMatters(
  clients: ClientRecord[],
  agreements: AgreementRecord[],
  approvals: ApprovalRecord[],
  statements: ServiceStatementRecord[],
): ScopedMatter[] {
  const result: ScopedMatter[] = [];
  for (const client of clients) {
    const clientAgreements = agreements.filter((a) => a.client_id === client.id);
    const clientApprovals = approvals.filter((a) => a.client_id === client.id);
    const clientStatements = statements.filter((s) => s.client_id === client.id);
    const units = buildMatterUnitsFromRecords(clientAgreements, clientApprovals);
    for (const unit of units) {
      result.push({
        client,
        scope: resolveMatterScope(unit, clientAgreements, clientApprovals, clientStatements),
      });
    }
  }
  return result;
}

function toMatterRef(client: ClientRecord, scope: MatterScope): MatterRef {
  return {
    clientId: client.id,
    fileId: scope.unit.fileId,
    fileSource: scope.unit.fileSource,
    fileNumber: scope.unit.fileNumber,
  };
}

const COMPLIANCE_ACTIVITY_PREFIXES = [
  'agreement',
  'approval',
  'service_statement',
  'document',
  'client',
];

function computeTrend(recentCount: number, priorCount: number): {
  trend: ComplianceTrend;
  trendLabel: string;
} {
  const delta = recentCount - priorCount;
  if (delta > 0) {
    return { trend: 'up', trendLabel: `+${delta} this week` };
  }
  if (delta < 0) {
    return { trend: 'down', trendLabel: `${delta} this week` };
  }
  return { trend: 'stable', trendLabel: 'No change' };
}

function maxIso(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function resolveActivityIcon(type: string, title: string): string {
  if (type.startsWith('approval.client_signed') || title.toLowerCase().includes('signed')) {
    return 'FileCheck2';
  }
  if (type.includes('certificate')) return 'Award';
  if (type.startsWith('service_statement')) return 'FileText';
  if (type.startsWith('approval')) return 'ClipboardCheck';
  if (type.startsWith('agreement')) return 'FileSignature';
  if (type.includes('file_note') || type === 'note') return 'StickyNote';
  if (type.includes('complete')) return 'CheckCircle2';
  return 'Activity';
}

function isComplianceActivity(type: string, title: string, body?: string): boolean {
  const hay = `${type} ${title} ${body || ''}`.toLowerCase();
  if (COMPLIANCE_ACTIVITY_PREFIXES.some((p) => type.startsWith(p))) return true;
  if (hay.includes('file note')) return true;
  if (hay.includes('marked complete')) return true;
  if (hay.includes('certificate')) return true;
  if (hay.includes('acknowledged')) return true;
  return false;
}

export class ComplianceDashboardService {
  constructor(private supabase: SupabaseClient) {}

  async getDashboard(agencyId: string, workspaceSlug: string): Promise<ComplianceDashboardPayload> {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [
      clientsRes,
      agreementsRes,
      approvalsRes,
      statementsRes,
      matterTypesRes,
      checklistRes,
      fileNotesRes,
      activityRes,
      recentNotesRes,
      usersRes,
    ] = await Promise.all([
      this.supabase
        .from('clients')
        .select('id, name, email, phone, created_at')
        .eq('agency_id', agencyId)
        .order('name'),
      this.supabase
        .from('agreements')
        .select(
          'id, client_id, agreement_number, matter_type_id, status, completed_at, sent_at, created_at, metadata, created_by, updated_at',
        )
        .eq('agency_id', agencyId)
        .is('deleted_at', null),
      this.supabase
        .from('application_approvals')
        .select(
          'id, client_id, approval_number, status, visa_subclass, matter_type_id, priority, client_sent_at, client_signed_at, lodged_at, lodgement_deadline, certificate_storage_path, certificate_generated_at, assigned_rma_id, created_by, created_at, updated_at',
        )
        .eq('agency_id', agencyId)
        .is('deleted_at', null),
      this.supabase
        .from('service_statements')
        .select(
          'id, client_id, agreement_id, approval_id, status, acknowledged_at, sent_at, created_at, updated_at',
        )
        .eq('agency_id', agencyId)
        .is('deleted_at', null),
      this.supabase.from('matter_types').select('id, name').eq('agency_id', agencyId),
      this.supabase
        .from('approval_checklist_items')
        .select('id, approval_id, agency_id, is_completed, updated_at, created_at')
        .eq('agency_id', agencyId)
        .eq('is_completed', false),
      this.supabase
        .from('file_notes')
        .select('client_id, file_source, file_id')
        .eq('agency_id', agencyId),
      this.supabase
        .from('activity_logs')
        .select('id, type, title, description, created_at, user_id, reference_id, reference_type')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(80),
      this.supabase
        .from('file_notes')
        .select(
          'id, client_id, body, recorded_at, created_by, note_type, is_system_note, users:created_by(full_name)',
        )
        .eq('agency_id', agencyId)
        .eq('is_system_note', false)
        .order('recorded_at', { ascending: false })
        .limit(15),
      this.supabase
        .from('users')
        .select('id, full_name')
        .eq('agency_id', agencyId),
    ]);

    if (clientsRes.error) throw new Error(clientsRes.error.message);

    const clients = filterProductionClients(
      (clientsRes.data || []) as ClientRecord[],
    );
    const clientIds = new Set(clients.map((c) => c.id));
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const agreements = ((agreementsRes.data || []) as AgreementRecord[]).filter(
      (a) => clientIds.has(a.client_id),
    );
    const approvals = ((approvalsRes.data || []) as ApprovalRecord[]).filter(
      (a) => a.client_id && clientIds.has(a.client_id),
    );
    const statements = ((statementsRes.data || []) as ServiceStatementRecord[]).filter(
      (s) => clientIds.has(s.client_id),
    );
    const checklistItems = checklistRes.data || [];
    const matterTypeNames = new Map(
      (matterTypesRes.data || []).map((mt: { id: string; name: string }) => [mt.id, mt.name]),
    );
    const approvalMap = new Map(approvals.map((a) => [a.id, a]));
    const userMap = new Map(
      (usersRes.data || []).map((u: { id: string; full_name: string }) => [
        u.id,
        u.full_name,
      ]),
    );

    const matterNoteKeys = new Set(
      (fileNotesRes.data || [])
        .filter(
          (n: { client_id: string; file_source?: string | null; file_id?: string | null }) =>
            clientIds.has(n.client_id) && n.file_source && n.file_id,
        )
        .map(
          (n: { client_id: string; file_source: string; file_id: string }) =>
            `${n.client_id}:${n.file_source}:${n.file_id}`,
        ),
    );

    const scopedMatters = collectScopedMatters(clients, agreements, approvals, statements);

    const activeApprovalIds = new Set(
      approvals
        .filter((a) => !['closed', 'rejected', 'draft'].includes(a.status || ''))
        .map((a) => a.id),
    );

    const outstandingByApproval = new Map<string, number>();
    for (const item of checklistItems) {
      if (!activeApprovalIds.has(item.approval_id)) continue;
      outstandingByApproval.set(
        item.approval_id,
        (outstandingByApproval.get(item.approval_id) || 0) + 1,
      );
    }

    const missingSaMatters = scopedMatters.filter(({ scope }) =>
      matterMissingServiceAgreement(scope),
    );
    const pendingApprovalMatters = scopedMatters.filter(({ scope }) =>
      matterPendingApprovalSignoff(scope),
    );
    const unackSosMatters = scopedMatters.filter(({ scope }) => matterUnacknowledgedSos(scope));
    const readyLodgeMatters = scopedMatters.filter(({ scope }) => matterReadyToLodge(scope));
    const incompleteMatters = scopedMatters.filter(({ scope }) => !scope.isComplete);

    const uniqueClientIds = (items: ScopedMatter[]) =>
      [...new Set(items.map((m) => m.client.id))];

    const missingSaIds = uniqueClientIds(missingSaMatters);
    const pendingApprovalIds = uniqueClientIds(pendingApprovalMatters);
    const unackSosIds = uniqueClientIds(unackSosMatters);
    const readyLodgeIds = uniqueClientIds(readyLodgeMatters);
    const incompleteIds = uniqueClientIds(incompleteMatters);

    const missingSaRecent = missingSaIds.filter((id) => {
      const created = clientMap.get(id)?.created_at;
      return created && created >= weekAgo;
    }).length;

    const pendingRecent = approvals.filter(
      (a) =>
        a.client_id &&
        a.client_sent_at &&
        a.client_sent_at >= weekAgo &&
        !a.client_signed_at,
    ).length;

    const unackRecent = statements.filter(
      (s) => s.sent_at && s.sent_at >= weekAgo && !s.acknowledged_at,
    ).length;

    const readyRecent = approvals.filter(
      (a) =>
        a.client_id &&
        (a.status === 'ready_to_lodge' ||
          (a.client_signed_at && a.client_signed_at >= weekAgo)),
    ).length;

    const summary: ComplianceSummaryCard[] = [
      {
        id: 'missing_sa',
        label: 'Missing Service Agreements',
        count: missingSaMatters.length,
        ...computeTrend(missingSaRecent, Math.max(0, missingSaMatters.length - missingSaRecent)),
        lastUpdated: maxIso(
          missingSaMatters
            .map(({ scope }) => scope.agreement?.updated_at || scope.agreement?.created_at),
        ),
        clientIds: missingSaIds,
        matters: missingSaMatters.map(({ client, scope }) => toMatterRef(client, scope)),
      },
      {
        id: 'pending_approval',
        label: 'Pending Approvals',
        count: pendingApprovalMatters.length,
        ...computeTrend(
          pendingRecent,
          Math.max(0, pendingApprovalMatters.length - pendingRecent),
        ),
        lastUpdated: maxIso(
          pendingApprovalMatters.map(({ scope }) => scope.approval?.client_sent_at || scope.approval?.updated_at),
        ),
        clientIds: pendingApprovalIds,
        matters: pendingApprovalMatters.map(({ client, scope }) => toMatterRef(client, scope)),
      },
      {
        id: 'awaiting_lodge',
        label: 'Awaiting Lodgement',
        count: readyLodgeMatters.length,
        ...computeTrend(readyRecent, Math.max(0, readyLodgeMatters.length - readyRecent)),
        lastUpdated: maxIso(
          readyLodgeMatters.map(({ scope }) => scope.approval?.client_signed_at || scope.approval?.updated_at),
        ),
        clientIds: readyLodgeIds,
        matters: readyLodgeMatters.map(({ client, scope }) => toMatterRef(client, scope)),
      },
      {
        id: 'missing_sos',
        label: 'Missing SOS',
        count: unackSosMatters.length,
        ...computeTrend(unackRecent, Math.max(0, unackSosMatters.length - unackRecent)),
        lastUpdated: maxIso(
          unackSosMatters.flatMap(({ scope }) =>
            scope.statements.map((s) => s.sent_at || s.updated_at),
          ),
        ),
        clientIds: unackSosIds,
        matters: unackSosMatters.map(({ client, scope }) => toMatterRef(client, scope)),
      },
      {
        id: 'incomplete_matters',
        label: 'Incomplete Matters',
        count: incompleteMatters.length,
        trend: incompleteMatters.length > 0 ? 'up' : 'stable',
        trendLabel:
          incompleteMatters.length > 0
            ? `${incompleteMatters.length} open matters`
            : 'All complete',
        lastUpdated: maxIso(
          incompleteMatters.map(({ scope }) => scope.approval?.updated_at || scope.agreement?.updated_at),
        ),
        clientIds: incompleteIds,
        matters: incompleteMatters.map(({ client, scope }) => toMatterRef(client, scope)),
      },
    ];

    const attentionQueue = this.buildMatterQueue(
      scopedMatters,
      outstandingByApproval,
      userMap,
      matterTypeNames,
      workspaceSlug,
    );

    const workflowFunnel = this.buildWorkflowFunnel(scopedMatters);

    const auditReadiness = this.buildAuditReadiness(scopedMatters);

    const filterOptions = this.buildFilterOptions(attentionQueue);

    const activity = this.buildActivityFeed(
      activityRes.data || [],
      recentNotesRes.data || [],
      clientMap,
      userMap,
      agreements,
      approvals,
      statements,
    );

    return {
      summary,
      activity,
      attentionQueue,
      workflowFunnel,
      auditReadiness,
      filterOptions,
      generatedAt: new Date().toISOString(),
    };
  }

  private resolveMatterTypeName(
    scope: MatterScope,
    matterTypeNames: Map<string, string>,
  ): string | null {
    const id = scope.approval?.matter_type_id || scope.agreement?.matter_type_id;
    return id ? matterTypeNames.get(id) || null : null;
  }

  private computeComplianceScore(scope: MatterScope): number {
    const gates = scope.gates;
    if (!gates.length) return 0;
    const met = gates.filter((g) => g.met).length;
    return Math.round((met / gates.length) * 100);
  }

  private collectAttentionReasons(
    client: ClientRecord,
    scope: MatterScope,
    outstandingByApproval: Map<string, number>,
  ): Array<{
    stage: string;
    since: string | null;
    risk: string;
    urgency: AttentionUrgency;
    agentId: string | null;
  }> {
    const reasons: Array<{
      stage: string;
      since: string | null;
      risk: string;
      urgency: AttentionUrgency;
      agentId: string | null;
    }> = [];
    const now = Date.now();

    if (matterMissingServiceAgreement(scope)) {
      const agreement = scope.agreement;
      const since = agreement?.sent_at || agreement?.created_at || client.created_at;
      const days = daysSince(since);
      reasons.push({
        stage: 'Missing Service Agreement',
        since,
        risk: 'OMARA engagement not executed',
        urgency: days >= 14 ? 'overdue' : days >= 7 ? 'attention' : 'normal',
        agentId: agreement?.created_by || null,
      });
    }

    const pendingApproval = scope.approval;
    if (pendingApproval && matterPendingApprovalSignoff(scope)) {
      const days = daysSince(pendingApproval.client_sent_at);
      const overdueDeadline =
        pendingApproval.lodgement_deadline &&
        new Date(pendingApproval.lodgement_deadline).getTime() < now;
      reasons.push({
        stage: 'Awaiting Approval',
        since: pendingApproval.client_sent_at || null,
        risk: 'Client sign-off overdue',
        urgency: overdueDeadline || days >= 14 ? 'overdue' : days >= 7 ? 'attention' : 'normal',
        agentId: pendingApproval.assigned_rma_id || pendingApproval.created_by || null,
      });
    }

    const approvalId = scope.unit.approvalId;
    const openDocs = approvalId ? outstandingByApproval.get(approvalId) || 0 : 0;
    if (openDocs > 0 && scope.approval) {
      reasons.push({
        stage: 'Outstanding documents',
        since: scope.approval.updated_at || scope.approval.created_at || null,
        risk: `${openDocs} checklist item${openDocs === 1 ? '' : 's'} incomplete`,
        urgency: openDocs >= 3 ? 'attention' : 'normal',
        agentId: scope.approval.assigned_rma_id || scope.approval.created_by || null,
      });
    }

    if (matterUnacknowledgedSos(scope)) {
      const sos = scope.statements
        .filter(
          (s) => (s.status === 'sent' || s.status === 'viewed') && !s.acknowledged_at,
        )
        .sort(
          (a, b) =>
            new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime(),
        )[0];
      const days = daysSince(sos?.sent_at);
      reasons.push({
        stage: 'Missing SOS',
        since: sos?.sent_at || null,
        risk: 'Fee disclosure not acknowledged',
        urgency: days >= 14 ? 'overdue' : days >= 7 ? 'attention' : 'normal',
        agentId: null,
      });
    }

    if (matterReadyToLodge(scope) && scope.approval) {
      const ready = scope.approval;
      const days = daysSince(ready.client_signed_at || ready.updated_at);
      const overdueDeadline =
        ready.lodgement_deadline &&
        new Date(ready.lodgement_deadline).getTime() < now;
      reasons.push({
        stage: 'Awaiting Lodgement',
        since: ready.client_signed_at || ready.updated_at || null,
        risk: overdueDeadline ? 'Lodgement deadline passed' : 'Awaiting lodgement',
        urgency: overdueDeadline ? 'overdue' : days >= 7 ? 'attention' : 'normal',
        agentId: ready.assigned_rma_id || ready.created_by || null,
      });
    }

    return reasons;
  }

  private buildMatterQueue(
    scopedMatters: ScopedMatter[],
    outstandingByApproval: Map<string, number>,
    userMap: Map<string, string>,
    matterTypeNames: Map<string, string>,
    workspaceSlug: string,
  ): AttentionQueueRow[] {
    const prefix = `/workspace/${workspaceSlug}`;
    const rows: AttentionQueueRow[] = [];

    for (const { client, scope } of scopedMatters) {
      const reasons = this.collectAttentionReasons(client, scope, outstandingByApproval);
      const top = reasons.sort((a, b) => {
        const order = { overdue: 0, attention: 1, normal: 2 };
        return order[a.urgency] - order[b.urgency];
      })[0];

      const workflowStage = deriveMatterCurrentStage(scope);
      const nextAction = deriveMatterNextAction(scope, {
        clientId: client.id,
        workspacePrefix: prefix,
      });
      const assigneeId =
        scope.approval?.assigned_rma_id ||
        scope.approval?.created_by ||
        scope.agreement?.created_by ||
        null;

      rows.push({
        clientId: client.id,
        clientName: client.name,
        fileId: scope.unit.fileId,
        fileSource: scope.unit.fileSource,
        fileNumber: scope.unit.fileNumber,
        matterType: this.resolveMatterTypeName(scope, matterTypeNames),
        visaSubclass: scope.unit.visaSubclass,
        currentStage: top?.stage || workflowStage,
        nextAction: nextAction.label,
        complianceScore: this.computeComplianceScore(scope),
        priority: scope.approval?.priority || null,
        daysWaiting: top ? daysSince(top.since) : 0,
        assignedAgent: assigneeId ? userMap.get(assigneeId) || 'Agent' : null,
        urgency: top?.urgency || 'normal',
        complianceRisk: top?.risk || null,
      });
    }

    return rows.sort((a, b) => {
      const order = { overdue: 0, attention: 1, normal: 2 };
      if (order[a.urgency] !== order[b.urgency]) {
        return order[a.urgency] - order[b.urgency];
      }
      return b.complianceScore - a.complianceScore;
    });
  }

  private buildFilterOptions(rows: AttentionQueueRow[]): ComplianceFilterOptions {
    const uniq = (vals: Array<string | null | undefined>) =>
      [...new Set(vals.filter(Boolean) as string[])].sort();

    return {
      matterTypes: uniq(rows.map((r) => r.matterType)),
      visaSubclasses: uniq(rows.map((r) => r.visaSubclass)),
      agents: uniq(rows.map((r) => r.assignedAgent)),
      stages: uniq(rows.map((r) => r.currentStage)),
      priorities: uniq(rows.map((r) => r.priority)),
      complianceStatuses: ['Complete', 'In progress', 'At risk'],
    };
  }

  private buildWorkflowFunnel(scopedMatters: ScopedMatter[]): WorkflowFunnelStage[] {
    let saSigned = 0;
    let preparation = 0;
    let approvalSent = 0;
    let approvalSigned = 0;
    let lodged = 0;
    let sosSent = 0;
    let sosAck = 0;
    let completed = 0;

    for (const { scope } of scopedMatters) {
      const { signals } = scope;
      if (signals.hasSignedServiceAgreement) saSigned += 1;
      if (
        scope.approval &&
        !['closed', 'rejected'].includes(scope.approval.status || '')
      ) {
        preparation += 1;
      }
      if (scope.approval?.client_sent_at) approvalSent += 1;
      if (signals.hasClientSignedApproval) approvalSigned += 1;
      if (signals.hasLodgedApplication) lodged += 1;
      if (
        scope.statements.some(
          (s) => s.sent_at || s.status === 'sent' || s.status === 'viewed',
        )
      ) {
        sosSent += 1;
      }
      if (signals.hasAcknowledgedStatementOfService) sosAck += 1;
      if (scope.isComplete) completed += 1;
    }

    return [
      { id: 'sa_signed', label: 'Service Agreement', count: saSigned },
      { id: 'preparation', label: 'Preparation', count: preparation },
      { id: 'approval_sent', label: 'Approval Sent', count: approvalSent },
      { id: 'approval_signed', label: 'Approval Signed', count: approvalSigned },
      { id: 'lodged', label: 'Lodgement', count: lodged },
      { id: 'sos_sent', label: 'SOS', count: sosSent },
      { id: 'sos_ack', label: 'SOS Acknowledged', count: sosAck },
      { id: 'completed', label: 'Completed', count: completed },
    ];
  }

  private buildAuditReadiness(scopedMatters: ScopedMatter[]): AuditReadiness {
    const total = scopedMatters.length || 1;

    const withSignedSa = scopedMatters.filter(({ scope }) =>
      scope.signals.hasSignedServiceAgreement,
    ).length;
    const withApprovalSigned = scopedMatters.filter(({ scope }) =>
      scope.signals.hasClientSignedApproval,
    ).length;
    const withLodged = scopedMatters.filter(({ scope }) =>
      scope.signals.hasLodgedApplication,
    ).length;
    const withAckSos = scopedMatters.filter(({ scope }) =>
      scope.signals.hasAcknowledgedStatementOfService,
    ).length;

    const pct = (n: number) => Math.round((n / total) * 100);

    const breakdown = {
      saSigned: { count: withSignedSa, total, percent: pct(withSignedSa) },
      approvalSigned: { count: withApprovalSigned, total, percent: pct(withApprovalSigned) },
      lodged: { count: withLodged, total, percent: pct(withLodged) },
      sosAcknowledged: { count: withAckSos, total, percent: pct(withAckSos) },
    };

    const percentage = Math.round(
      (breakdown.saSigned.percent +
        breakdown.approvalSigned.percent +
        breakdown.lodged.percent +
        breakdown.sosAcknowledged.percent) /
        4,
    );

    const missingRequirements = [
      { label: 'SA signed', matterCount: total - withSignedSa },
      { label: 'Approval signed', matterCount: total - withApprovalSigned },
      { label: 'Lodged', matterCount: total - withLodged },
      { label: 'SOS acknowledged', matterCount: total - withAckSos },
    ].filter((m) => m.matterCount > 0);

    return {
      percentage,
      breakdown,
      missingRequirements,
      explanation:
        'Matter readiness is the average of four workflow gates across active matters: signed service agreement, signed application approval, lodged application, and acknowledged Statement of Service. Each gate is calculated per matter unit, then averaged.',
    };
  }

  private buildActivityFeed(
    logs: Array<{
      id: string;
      type: string;
      title: string;
      description?: string | null;
      created_at: string;
      user_id?: string | null;
      reference_id?: string | null;
      reference_type?: string | null;
    }>,
    notes: Array<{
      id: string;
      client_id: string;
      body: string;
      recorded_at: string;
      created_by?: string | null;
      users?: { full_name?: string } | null;
    }>,
    clientMap: Map<string, ClientRecord>,
    userMap: Map<string, string>,
    agreements: AgreementRecord[],
    approvals: ApprovalRecord[],
    statements: ServiceStatementRecord[],
  ): ComplianceActivityItem[] {
    const agreementClient = new Map(agreements.map((a) => [a.id, a.client_id]));
    const approvalClient = new Map(
      approvals.map((a) => [a.id, a.client_id]),
    );
    const statementClient = new Map(
      statements.map((s) => [s.id, s.client_id]),
    );

    const items: ComplianceActivityItem[] = [];

    for (const log of logs) {
      if (!isComplianceActivity(log.type, log.title, log.description || '')) {
        continue;
      }
      const clientId = this.resolveClientIdFromMaps(
        log.reference_type,
        log.reference_id,
        agreementClient,
        approvalClient,
        statementClient,
      );
      const clientName = clientId
        ? clientMap.get(clientId)?.name || 'Client'
        : this.extractClientFromText(log.title, log.description || '') || 'Practice';

      items.push({
        id: `log-${log.id}`,
        source: 'activity_log',
        icon: resolveActivityIcon(log.type, log.title),
        timestamp: log.created_at,
        agentName: log.user_id ? userMap.get(log.user_id) || 'Agent' : 'System',
        clientName,
        clientId,
        action: log.title,
        type: log.type,
      });
    }

    for (const note of notes) {
      const client = clientMap.get(note.client_id);
      items.push({
        id: `note-${note.id}`,
        source: 'file_note',
        icon: 'StickyNote',
        timestamp: note.recorded_at,
        agentName: note.users?.full_name || 'Agent',
        clientName: client?.name || 'Client',
        clientId: note.client_id,
        action: 'File note added',
        type: 'file_note',
      });
    }

    return items
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 20);
  }

  private resolveClientIdFromMaps(
    referenceType?: string | null,
    referenceId?: string | null,
    agreementClient?: Map<string, string>,
    approvalClient?: Map<string, string | null>,
    statementClient?: Map<string, string>,
  ): string | null {
    if (!referenceId) return null;
    if (referenceType === 'client') return referenceId;
    if (referenceType === 'agreement') {
      return agreementClient?.get(referenceId) || null;
    }
    if (referenceType === 'application_approval') {
      return approvalClient?.get(referenceId) || null;
    }
    if (referenceType === 'service_statement') {
      return statementClient?.get(referenceId) || null;
    }
    return null;
  }

  private extractClientFromText(title: string, description: string): string | null {
    const match = `${title} ${description}`.match(/for\s+([A-Za-z][A-Za-z\s.'-]{2,40})/i);
    return match?.[1]?.trim() || null;
  }
}
