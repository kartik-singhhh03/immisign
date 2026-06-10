import type { ClientFile, ClientFileSource } from '@/features/file-notes/services/client-files.service'
import {
  computeSignalsFromRecords,
  deriveCompletionGates,
  isMatterComplete,
  type ClientWorkflowSignals,
  type CompletionGate,
} from './client-completion'

/** Records used for matter-scoped workflow (pass only scoped subsets). */
export type MatterAgreementRecord = {
  id: string
  agreement_number?: string | null
  status?: string | null
  completed_at?: string | null
  sent_at?: string | null
  created_by?: string | null
  matter_type_id?: string | null
  visa_stream?: string | null
  metadata?: unknown
  created_at?: string
  updated_at?: string
}

export type MatterApprovalRecord = {
  id: string
  approval_number?: string | null
  title?: string | null
  status?: string | null
  visa_subclass?: string | null
  visa_stream?: string | null
  priority?: string | null
  matter_type_id?: string | null
  assigned_rma_id?: string | null
  assigned_reviewer_id?: string | null
  created_by?: string | null
  client_sent_at?: string | null
  client_signed_at?: string | null
  lodged_at?: string | null
  ready_to_lodge_at?: string | null
  lodgement_deadline?: string | null
  certificate_storage_path?: string | null
  certificate_generated_at?: string | null
  matter_completed_at?: string | null
  matter_completed_by?: string | null
  matter_completion_reason?: string | null
  on_hold_at?: string | null
  created_at?: string
  updated_at?: string
}

export type MatterStatementRecord = {
  id: string
  agreement_id?: string | null
  approval_id?: string | null
  status?: string | null
  acknowledged_at?: string | null
  sent_at?: string | null
  created_at?: string
  updated_at?: string
}

/** One logical matter (may link agreement + approval by file number). */
export type MatterUnit = {
  fileNumber: string
  fileSource: ClientFileSource
  fileId: string
  agreementId: string | null
  approvalId: string | null
  visaSubclass: string | null
}

export type MatterScope = {
  unit: MatterUnit
  agreement: MatterAgreementRecord | null
  approval: MatterApprovalRecord | null
  agreements: MatterAgreementRecord[]
  approvals: MatterApprovalRecord[]
  statements: MatterStatementRecord[]
  signals: ClientWorkflowSignals
  gates: CompletionGate[]
  isComplete: boolean
}

export function extractAgreementVisa(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  const raw = (m.visaSubclass as string) || (m.visa_subclass as string) || null
  return raw?.trim() || null
}

function normalizeVisa(v: string | null | undefined): string | null {
  if (!v?.trim()) return null
  return v.trim().replace(/^SC\s*/i, '')
}

function visasMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeVisa(a)
  const nb = normalizeVisa(b)
  return Boolean(na && nb && na === nb)
}

function findLinkedApproval(
  agreement: MatterAgreementRecord | null,
  approvals: MatterApprovalRecord[],
  fileNumber: string,
): MatterApprovalRecord | null {
  if (!agreement && !fileNumber) return null
  const byNumber = approvals.find((a) => a.approval_number === fileNumber)
  if (byNumber) return byNumber
  if (agreement) {
    const visa = extractAgreementVisa(agreement.metadata)
    return approvals.find((a) => visasMatch(a.visa_subclass, visa)) || null
  }
  return null
}

function findLinkedAgreement(
  approval: MatterApprovalRecord | null,
  agreements: MatterAgreementRecord[],
  fileNumber: string,
): MatterAgreementRecord | null {
  if (!approval && !fileNumber) return null
  const byNumber = agreements.find((a) => a.agreement_number === fileNumber)
  if (byNumber) return byNumber
  if (approval?.visa_subclass) {
    return (
      agreements.find((a) => visasMatch(extractAgreementVisa(a.metadata), approval.visa_subclass)) ||
      null
    )
  }
  return null
}

function filterStatementsForScope(
  statements: MatterStatementRecord[],
  agreementId: string | null,
  approvalId: string | null,
): MatterStatementRecord[] {
  if (!agreementId && !approvalId) return []
  return statements.filter(
    (s) =>
      (agreementId && s.agreement_id === agreementId) ||
      (approvalId && s.approval_id === approvalId),
  )
}

/** Build matter units from agreement/approval records (no ClientFilesService). */
export function buildMatterUnitsFromRecords(
  agreements: MatterAgreementRecord[],
  approvals: MatterApprovalRecord[],
): MatterUnit[] {
  const byNumber = new Map<
    string,
    { agreementId: string | null; approvalId: string | null }
  >()

  for (const a of agreements) {
    const key = a.agreement_number || a.id
    const entry = byNumber.get(key) || { agreementId: null, approvalId: null }
    entry.agreementId = a.id
    byNumber.set(key, entry)
  }
  for (const a of approvals) {
    const key = a.approval_number || a.id
    const entry = byNumber.get(key) || { agreementId: null, approvalId: null }
    entry.approvalId = a.id
    byNumber.set(key, entry)
  }

  return Array.from(byNumber.entries()).map(([fileNumber, ids]) => {
    const approval = ids.approvalId
      ? approvals.find((a) => a.id === ids.approvalId) || null
      : null
    const agreement = ids.agreementId
      ? agreements.find((a) => a.id === ids.agreementId) || null
      : null
    const fileSource: ClientFileSource = ids.approvalId
      ? 'application_approval'
      : 'agreement'
    const fileId = ids.approvalId || ids.agreementId || ''
    return {
      fileNumber,
      fileSource,
      fileId,
      agreementId: ids.agreementId,
      approvalId: ids.approvalId,
      visaSubclass: normalizeVisa(
        approval?.visa_subclass ||
          (agreement ? extractAgreementVisa(agreement.metadata) : null),
      ),
    }
  })
}

/** Group client files into logical matter units (dedupe agreement+approval pairs). */
export function groupFilesIntoMatterUnits(files: ClientFile[]): MatterUnit[] {
  const byNumber = new Map<string, ClientFile[]>()
  for (const f of files) {
    const key = f.file_number || f.id
    if (!byNumber.has(key)) byNumber.set(key, [])
    byNumber.get(key)!.push(f)
  }

  return Array.from(byNumber.entries()).map(([fileNumber, group]) => {
    const agreementFile = group.find((f) => f.source === 'agreement')
    const approvalFile = group.find((f) => f.source === 'application_approval')
    const primary = approvalFile || agreementFile || group[0]
    return {
      fileNumber,
      fileSource: primary.source,
      fileId: primary.id,
      agreementId: agreementFile?.id ?? null,
      approvalId: approvalFile?.id ?? null,
      visaSubclass: normalizeVisa(primary.visa_subclass?.replace(/^SC\s*/i, '') || null),
    }
  })
}

export function buildMatterUnitFromFile(
  file: ClientFile,
  allAgreements: MatterAgreementRecord[],
  allApprovals: MatterApprovalRecord[],
): MatterUnit {
  const agreementId = file.source === 'agreement' ? file.id : null
  const approvalId = file.source === 'application_approval' ? file.id : null
  let linkedAgreementId = agreementId
  let linkedApprovalId = approvalId

  if (file.source === 'agreement') {
    const linked = findLinkedApproval(
      allAgreements.find((a) => a.id === file.id) || null,
      allApprovals,
      file.file_number,
    )
    if (linked) linkedApprovalId = linked.id
  } else {
    const linked = findLinkedAgreement(
      allApprovals.find((a) => a.id === file.id) || null,
      allAgreements,
      file.file_number,
    )
    if (linked) linkedAgreementId = linked.id
  }

  return {
    fileNumber: file.file_number,
    fileSource: file.source,
    fileId: file.id,
    agreementId: linkedAgreementId,
    approvalId: linkedApprovalId,
    visaSubclass: normalizeVisa(file.visa_subclass?.replace(/^SC\s*/i, '') || null),
  }
}

export function resolveMatterScope(
  unit: MatterUnit,
  allAgreements: MatterAgreementRecord[],
  allApprovals: MatterApprovalRecord[],
  allStatements: MatterStatementRecord[],
): MatterScope {
  const agreement = unit.agreementId
    ? allAgreements.find((a) => a.id === unit.agreementId) || null
    : null
  const approval = unit.approvalId
    ? allApprovals.find((a) => a.id === unit.approvalId) || null
    : null

  const agreements = agreement ? [agreement] : []
  const approvals = approval ? [approval] : []
  const statements = filterStatementsForScope(allStatements, unit.agreementId, unit.approvalId)

  const signals = computeSignalsFromRecords({
    agreements,
    approvals,
    serviceStatements: statements,
  })
  const gates = deriveCompletionGates(signals)

  return {
    unit,
    agreement,
    approval,
    agreements,
    approvals,
    statements,
    signals,
    gates,
    isComplete: isMatterComplete(signals),
  }
}

export function resolveMatterScopeFromFile(
  file: ClientFile | null,
  allAgreements: MatterAgreementRecord[],
  allApprovals: MatterApprovalRecord[],
  allStatements: MatterStatementRecord[],
): MatterScope | null {
  if (!file) return null
  const unit = buildMatterUnitFromFile(file, allAgreements, allApprovals)
  return resolveMatterScope(unit, allAgreements, allApprovals, allStatements)
}

export function matterWorkflowStage(scope: MatterScope): string {
  if (scope.isComplete) return 'Completed'
  const { signals, approvals, statements } = scope
  if (signals.hasAcknowledgedStatementOfService) return 'SOS Acknowledged'
  if (statements.some((s) => s.sent_at || s.status === 'sent' || s.status === 'viewed')) {
    return 'SOS Sent'
  }
  if (signals.hasLodgedApplication) return 'Lodged'
  if (signals.hasClientSignedApproval) return 'Approval Signed'
  if (approvals.some((a) => a.client_sent_at)) return 'Approval Sent'
  const approval = scope.approval
  if (approval?.status === 'draft') return 'Application Preparation'
  if (
    approval &&
    !['closed', 'rejected', 'lodged'].includes(approval.status || '')
  ) {
    return 'Application Preparation'
  }
  if (signals.hasSignedServiceAgreement) return 'Service Agreement Signed'
  if (scope.agreement?.sent_at || scope.agreement?.status === 'sent') return 'Service Agreement'
  if (scope.agreement) return 'Service Agreement'
  return 'Onboarding'
}

export function deriveMatterCurrentStage(scope: MatterScope): string {
  if (scope.isComplete) return 'Completed'
  const { signals, approvals, statements } = scope
  if (signals.hasAcknowledgedStatementOfService) return 'Statement of Service'
  if (statements.some((s) => s.sent_at || s.status === 'sent' || s.status === 'viewed')) {
    return 'Statement of Service'
  }
  if (signals.hasLodgedApplication) return 'Lodgement'
  if (signals.hasClientSignedApproval) return 'Application Approval'
  if (approvals.some((a) => a.client_sent_at)) return 'Application Approval'
  if (approvals.some((a) => a.status === 'draft')) return 'Application Preparation'
  if (
    approvals.some(
      (a) => a.status && !['closed', 'rejected', 'lodged', 'draft'].includes(a.status),
    )
  ) {
    return 'Application Preparation'
  }
  if (signals.hasSignedServiceAgreement) return 'File Notes'
  if (scope.agreement?.sent_at || scope.agreement?.status === 'sent') return 'Service Agreement'
  if (scope.agreement) return 'Service Agreement'
  return 'Service Agreement'
}

export function deriveMatterStatus(scope: MatterScope): string {
  if (scope.isComplete) return 'Completed'
  const { agreement, approval } = scope
  if (approval) {
    if (approval.status === 'closed') return 'Archived'
    if (approval.status === 'lodged' || approval.lodged_at) return 'Lodged'
    if (approval.status === 'rejected') return 'On Hold'
    if (approval.client_sent_at && !approval.client_signed_at) return 'Pending Client'
    if (approval.status === 'ready_to_lodge') return 'Awaiting Approval'
    if (approval.status === 'approved' || approval.client_signed_at) return 'Open'
    if (approval.status === 'draft') return 'Open'
  }
  if (agreement) {
    if (agreement.status === 'cancelled') return 'Archived'
    if (agreement.status === 'sent' && !agreement.completed_at) return 'Pending Client'
    if (agreement.status === 'signed' || agreement.status === 'completed') return 'Open'
  }
  return 'Open'
}

export function matterMissingServiceAgreement(scope: MatterScope): boolean {
  if (!scope.agreement) return true
  return !scope.signals.hasSignedServiceAgreement
}

export function matterPendingApprovalSignoff(scope: MatterScope): boolean {
  const a = scope.approval
  if (!a) return false
  return (
    Boolean(a.client_sent_at) &&
    !a.client_signed_at &&
    !['closed', 'rejected', 'lodged'].includes(a.status || '')
  )
}

export function matterUnacknowledgedSos(scope: MatterScope): boolean {
  return scope.statements.some(
    (s) =>
      (s.status === 'sent' || s.status === 'viewed') &&
      !s.acknowledged_at &&
      s.status !== 'acknowledged',
  )
}

export function matterReadyToLodge(scope: MatterScope): boolean {
  const a = scope.approval
  if (!a) return false
  return (
    a.status === 'ready_to_lodge' ||
    (Boolean(a.client_signed_at) && a.status === 'approved' && !a.lodged_at && a.status !== 'lodged')
  )
}

export type MatterNextAction = {
  label: string
  description: string
  href: string | null
  tone: 'primary' | 'warning' | 'success' | 'muted'
}

export function deriveMatterNextAction(
  scope: MatterScope,
  opts: { clientId: string; workspacePrefix: string },
): MatterNextAction {
  const { clientId, workspacePrefix: prefix } = opts
  const { signals, agreement, approval, agreements, approvals, statements } = scope

  if (scope.isComplete) {
    return {
      label: 'Matter Complete',
      description: 'All compliance gates are satisfied for this matter.',
      href: null,
      tone: 'success',
    }
  }

  if (!signals.hasSignedServiceAgreement) {
    if (agreement?.status === 'sent' || agreement?.sent_at) {
      return {
        label: 'Awaiting Client Signature',
        description: 'Service agreement sent — waiting for client signature.',
        href: `${prefix}/agreements/${agreement.id}`,
        tone: 'warning',
      }
    }
    if (agreement) {
      return {
        label: 'Send Service Agreement',
        description: 'Complete and send the service agreement for signature.',
        href: `${prefix}/agreements/${agreement.id}`,
        tone: 'primary',
      }
    }
    return {
      label: 'Create Service Agreement',
      description: 'Start this matter with a service agreement.',
      href: `${prefix}/agreements/new?clientId=${clientId}`,
      tone: 'primary',
    }
  }

  if (approval?.client_sent_at && !approval.client_signed_at) {
    return {
      label: 'Awaiting Client Approval',
      description: 'Application approval sent — waiting for client sign-off.',
      href: `${prefix}/approvals/${approval.id}`,
      tone: 'warning',
    }
  }

  if (!approval) {
    return {
      label: 'Send Application Approval',
      description: 'Prepare and send the application approval for this matter.',
      href: `${prefix}/approvals/new?clientId=${clientId}`,
      tone: 'primary',
    }
  }

  if (matterReadyToLodge(scope)) {
    return {
      label: 'Mark Lodgement',
      description: 'Application approved — record lodgement with the department.',
      href: `${prefix}/approvals/${approval.id}`,
      tone: 'primary',
    }
  }

  const hasSosSent = statements.some(
    (s) => s.sent_at || s.status === 'sent' || s.status === 'viewed',
  )

  if (signals.hasLodgedApplication && !hasSosSent) {
    return {
      label: 'Generate Statement of Service',
      description: 'Lodgement recorded — issue the Statement of Service.',
      href: `${prefix}/service-statements/new?clientId=${clientId}${approval ? `&approvalId=${approval.id}` : ''}`,
      tone: 'primary',
    }
  }

  if (hasSosSent && !signals.hasAcknowledgedStatementOfService) {
    const qs = scope.unit.fileSource && scope.unit.fileId
      ? `&file_source=${scope.unit.fileSource}&file_id=${scope.unit.fileId}`
      : ''
    return {
      label: 'Awaiting SOS Acknowledgement',
      description: 'Statement of Service sent — waiting for acknowledgement.',
      href: `${prefix}/clients/${clientId}?tab=statement_of_service${qs}`,
      tone: 'warning',
    }
  }

  if (approval.status === 'draft') {
    return {
      label: 'Continue Application Preparation',
      description: 'Complete the draft application approval for this matter.',
      href: `${prefix}/approvals/${approval.id}`,
      tone: 'primary',
    }
  }

  return {
    label: 'Continue Matter',
    description: 'Review this matter workflow for next steps.',
    href: approval
      ? `${prefix}/approvals/${approval.id}`
      : agreement
        ? `${prefix}/agreements/${agreement.id}`
        : `${prefix}/clients/${clientId}`,
    tone: 'muted',
  }
}

export function buildMatterWorkflowTimeline(
  scope: MatterScope,
  notesCount: number,
): Array<{ id: string; label: string; complete: boolean; current?: boolean }> {
  const { signals } = scope
  const approval = scope.approval
  const hasPrep =
    approval?.status === 'draft' ||
    Boolean(
      approval &&
        !['closed', 'rejected', 'lodged'].includes(approval.status || ''),
    )
  const hasSosSent = scope.statements.some(
    (s) => s.sent_at || s.status === 'sent' || s.status === 'viewed',
  )

  const timeline = [
    { id: 'service_agreement', label: 'Service Agreement', complete: signals.hasSignedServiceAgreement },
    { id: 'file_notes', label: 'File Notes', complete: notesCount > 0 },
    { id: 'preparation', label: 'Preparation', complete: hasPrep },
    { id: 'approval', label: 'Approval', complete: signals.hasClientSignedApproval },
    { id: 'lodgement', label: 'Lodgement', complete: signals.hasLodgedApplication },
    {
      id: 'sos',
      label: 'Statement of Service',
      complete: signals.hasAcknowledgedStatementOfService || hasSosSent,
    },
    { id: 'completion', label: 'Completion', complete: scope.isComplete },
  ]

  const currentIdx = timeline.findIndex((s) => !s.complete)
  if (currentIdx >= 0) timeline[currentIdx].current = true
  else if (timeline.length) timeline[timeline.length - 1].current = true

  return timeline
}

/** Map a service statement row to its matter file scope. */
export function resolveFileScopeFromStatement(statement: {
  agreement_id?: string | null
  approval_id?: string | null
}): { fileSource: ClientFileSource; fileId: string } | null {
  if (statement.approval_id) {
    return { fileSource: 'application_approval', fileId: statement.approval_id }
  }
  if (statement.agreement_id) {
    return { fileSource: 'agreement', fileId: statement.agreement_id }
  }
  return null
}

export function buildMatterClientPath(
  workspaceSlug: string,
  clientId: string,
  fileSource: ClientFileSource,
  fileId: string,
  tab?: string,
): string {
  const params = new URLSearchParams({
    file_source: fileSource,
    file_id: fileId,
  })
  if (tab) params.set('tab', tab)
  return `/workspace/${workspaceSlug}/clients/${clientId}?${params.toString()}`
}

/** Matter-scoped completion check for system notes / notifications. */
export function isMatterCompleteFromRecords(
  agreementId: string | null,
  approvalId: string | null,
  allAgreements: MatterAgreementRecord[],
  allApprovals: MatterApprovalRecord[],
  allStatements: MatterStatementRecord[],
): boolean {
  let unit: MatterUnit | null = null

  if (approvalId) {
    const approval = allApprovals.find((a) => a.id === approvalId) || null
    const linkedAgreement =
      (agreementId ? allAgreements.find((a) => a.id === agreementId) : null) ||
      findLinkedAgreement(approval, allAgreements, approval?.approval_number || '')
    unit = {
      fileNumber: approval?.approval_number || approvalId,
      fileSource: 'application_approval',
      fileId: approvalId,
      agreementId: linkedAgreement?.id || agreementId,
      approvalId,
      visaSubclass: normalizeVisa(approval?.visa_subclass || null),
    }
  } else if (agreementId) {
    const agreement = allAgreements.find((a) => a.id === agreementId) || null
    const linkedApproval = findLinkedApproval(
      agreement,
      allApprovals,
      agreement?.agreement_number || '',
    )
    unit = {
      fileNumber: agreement?.agreement_number || agreementId,
      fileSource: 'agreement',
      fileId: agreementId,
      agreementId,
      approvalId: linkedApproval?.id || approvalId,
      visaSubclass: normalizeVisa(
        linkedApproval?.visa_subclass || extractAgreementVisa(agreement?.metadata),
      ),
    }
  }

  if (!unit) return false
  return resolveMatterScope(unit, allAgreements, allApprovals, allStatements).isComplete
}

/** True only when every logical matter unit has all gates satisfied. */
export function areAllClientMattersComplete(
  matters: ClientFile[],
  allAgreements: MatterAgreementRecord[],
  allApprovals: MatterApprovalRecord[],
  allStatements: MatterStatementRecord[],
): boolean {
  const units = groupFilesIntoMatterUnits(matters)
  if (!units.length) return false
  return units.every((unit) =>
    resolveMatterScope(unit, allAgreements, allApprovals, allStatements).isComplete,
  )
}
