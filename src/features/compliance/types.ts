export type ComplianceTrend = 'up' | 'down' | 'stable';

export type ComplianceFilterKey =
  | 'missing_sa'
  | 'pending_approval'
  | 'awaiting_lodge'
  | 'missing_sos'
  | 'incomplete_matters';

/** @deprecated Legacy keys from pre-MM-2 dashboards */
export type LegacyComplianceFilterKey =
  | 'outstanding_docs'
  | 'unack_sos'
  | 'ready_lodge'
  | 'completed';

export type ComplianceSummaryCard = {
  id: ComplianceFilterKey;
  label: string;
  count: number;
  trend: ComplianceTrend;
  trendLabel: string;
  lastUpdated: string | null;
  clientIds: string[];
  matters?: MatterRef[];
};

export type ComplianceActivityItem = {
  id: string;
  source: 'activity_log' | 'file_note';
  icon: string;
  timestamp: string;
  agentName: string;
  clientName: string;
  clientId: string | null;
  action: string;
  type: string;
};

export type AttentionUrgency = 'overdue' | 'attention' | 'normal';

export type MatterRef = {
  clientId: string;
  fileId: string;
  fileSource: 'agreement' | 'application_approval';
  fileNumber: string;
};

export type AttentionQueueRow = {
  clientId: string;
  clientName: string;
  fileId: string;
  fileSource: 'agreement' | 'application_approval';
  fileNumber: string;
  matterType: string | null;
  visaSubclass: string | null;
  currentStage: string;
  nextAction: string;
  complianceScore: number;
  priority: string | null;
  assignedAgent: string | null;
  daysWaiting: number;
  urgency: AttentionUrgency;
  complianceRisk: string | null;
};

export type WorkflowFunnelStage = {
  id: string;
  label: string;
  count: number;
};

export type AuditReadinessBreakdown = {
  saSigned: { count: number; total: number; percent: number };
  approvalSigned: { count: number; total: number; percent: number };
  lodged: { count: number; total: number; percent: number };
  sosAcknowledged: { count: number; total: number; percent: number };
};

export type AuditReadiness = {
  percentage: number;
  breakdown: AuditReadinessBreakdown;
  missingRequirements: Array<{ label: string; matterCount: number }>;
  explanation: string;
};

export type ComplianceFilterOptions = {
  matterTypes: string[];
  visaSubclasses: string[];
  agents: string[];
  stages: string[];
  priorities: string[];
  complianceStatuses: string[];
};

export type ComplianceDashboardPayload = {
  summary: ComplianceSummaryCard[];
  activity: ComplianceActivityItem[];
  attentionQueue: AttentionQueueRow[];
  workflowFunnel: WorkflowFunnelStage[];
  auditReadiness: AuditReadiness;
  filterOptions: ComplianceFilterOptions;
  generatedAt: string;
};
