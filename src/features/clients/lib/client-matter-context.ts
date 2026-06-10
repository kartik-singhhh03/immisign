import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientFile, ClientFileSource } from '@/features/file-notes/services/client-files.service'
import { ClientFilesService } from '@/features/file-notes/services/client-files.service'
import {
  areAllClientMattersComplete,
  buildMatterWorkflowTimeline,
  deriveMatterCurrentStage,
  deriveMatterNextAction,
  deriveMatterStatus,
  extractAgreementVisa,
  groupFilesIntoMatterUnits,
  resolveMatterScopeFromFile,
  type MatterAgreementRecord,
  type MatterApprovalRecord,
  type MatterStatementRecord,
} from './matter-scope'

function primaryFilesFromUnits(files: ClientFile[]): ClientFile[] {
  const units = groupFilesIntoMatterUnits(files)
  return units
    .map((unit) => files.find((f) => f.source === unit.fileSource && f.id === unit.fileId))
    .filter((f): f is ClientFile => Boolean(f))
}

function resolveSelectedMatter(
  files: ClientFile[],
  fileSource?: ClientFileSource,
  fileId?: string,
): ClientFile | null {
  if (!fileSource || !fileId) return null

  const direct = files.find((m) => m.source === fileSource && m.id === fileId)
  if (direct) {
    const unit = groupFilesIntoMatterUnits(files).find(
      (u) =>
        u.fileSource === fileSource && u.fileId === fileId ||
        u.agreementId === fileId ||
        u.approvalId === fileId,
    )
    if (unit) {
      return files.find((f) => f.source === unit.fileSource && f.id === unit.fileId) || direct
    }
    return direct
  }

  const unit = groupFilesIntoMatterUnits(files).find(
    (u) => u.agreementId === fileId || u.approvalId === fileId,
  )
  if (!unit) return null
  return files.find((f) => f.source === unit.fileSource && f.id === unit.fileId) || null
}

export type MatterWorkflowStage = {
  id: string
  label: string
  complete: boolean
  current?: boolean
}

export type MatterComplianceItem = {
  id: string
  label: string
  status: 'complete' | 'action' | 'blocked'
}

export type ClientMatterContext = {
  matters: ClientFile[]
  selectedMatter: ClientFile | null
  fileNumber: string | null
  clientNumber: string | null
  matterType: string | null
  visaSubclass: string | null
  visaStream: string | null
  assignedAgent: { id: string; name: string } | null
  currentStage: string
  matterStatus: string
  priority: string | null
  compliance: {
    completed: number
    total: number
    scorePercent: number
    items: MatterComplianceItem[]
  }
  workflowTimeline: MatterWorkflowStage[]
  nextAction: {
    label: string
    description: string
    href: string | null
    tone: 'primary' | 'warning' | 'success' | 'muted'
  }
  isComplete: boolean
  allMattersComplete: boolean
  matterCompletion: {
    completedAt: string | null
    completedByName: string | null
  } | null
}

function extractAgreementStream(row: MatterAgreementRecord): string | null {
  if (row.visa_stream?.trim()) return row.visa_stream.trim()
  if (!row.metadata || typeof row.metadata !== 'object') return null
  const m = row.metadata as Record<string, unknown>
  const raw = (m.visaStream as string) || (m.visa_stream as string) || null
  return raw?.trim() || null
}

function complianceItemStatus(met: boolean, blocked = false): MatterComplianceItem['status'] {
  if (met) return 'complete'
  if (blocked) return 'blocked'
  return 'action'
}

export async function buildClientMatterContext(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  workspaceSlug: string,
  options?: {
    fileSource?: ClientFileSource
    fileId?: string
  },
): Promise<ClientMatterContext> {
  const filesService = new ClientFilesService(supabase)
  const allFiles = await filesService.listClientFiles(agencyId, clientId, { activeOnly: true })
  const matters = primaryFilesFromUnits(allFiles)

  const { data: clientRow } = await supabase
    .from('clients')
    .select('client_number')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  let selectedMatter: ClientFile | null = null
  if (options?.fileSource && options?.fileId) {
    selectedMatter = resolveSelectedMatter(allFiles, options.fileSource, options.fileId)
  } else if (matters.length) {
    selectedMatter = matters[0]
  }

  const prefix = `/workspace/${workspaceSlug}`

  const [agRes, apRes, sosRes] = await Promise.all([
    supabase
      .from('agreements')
      .select(
        'id, agreement_number, status, completed_at, sent_at, created_by, matter_type_id, visa_stream, metadata, created_at',
      )
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase
      .from('application_approvals')
      .select(
        'id, approval_number, title, status, visa_subclass, visa_stream, priority, matter_type_id, assigned_rma_id, assigned_reviewer_id, created_by, client_sent_at, client_signed_at, lodged_at, ready_to_lodge_at, matter_completed_at, matter_completed_by, on_hold_at, created_at',
      )
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('service_statements')
      .select('id, agreement_id, approval_id, status, acknowledged_at, sent_at, created_at')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const agreements = (agRes.data || []) as MatterAgreementRecord[]
  const approvals = (apRes.data || []) as MatterApprovalRecord[]
  const statements = (sosRes.data || []) as MatterStatementRecord[]

  const scope = resolveMatterScopeFromFile(selectedMatter, agreements, approvals, statements)

  const primaryAgreement = scope?.agreement || null
  const primaryApproval = scope?.approval || null

  const matterTypeIds = new Set<string>()
  if (primaryAgreement?.matter_type_id) matterTypeIds.add(primaryAgreement.matter_type_id)
  if (primaryApproval?.matter_type_id) matterTypeIds.add(primaryApproval.matter_type_id)

  const matterNames: Record<string, string> = {}
  if (matterTypeIds.size) {
    const { data: mts } = await supabase
      .from('matter_types')
      .select('id, name')
      .in('id', Array.from(matterTypeIds))
    for (const mt of mts || []) matterNames[mt.id] = mt.name
  }

  const fileNumber =
    selectedMatter?.file_number ||
    primaryApproval?.approval_number ||
    primaryAgreement?.agreement_number ||
    clientRow?.client_number ||
    null

  const matterType =
    selectedMatter?.matter_label ||
    (primaryApproval?.matter_type_id ? matterNames[primaryApproval.matter_type_id] : null) ||
    (primaryAgreement?.matter_type_id ? matterNames[primaryAgreement.matter_type_id] : null) ||
    null

  const visaSubclass =
    selectedMatter?.visa_subclass?.replace(/^SC\s*/i, '') ||
    primaryApproval?.visa_subclass ||
    (primaryAgreement ? extractAgreementVisa(primaryAgreement.metadata) : null) ||
    null

  const visaStream =
    primaryApproval?.visa_stream?.trim() ||
    (primaryAgreement ? extractAgreementStream(primaryAgreement) : null) ||
    null

  const assigneeId =
    primaryApproval?.assigned_rma_id ||
    primaryApproval?.assigned_reviewer_id ||
    primaryApproval?.created_by ||
    primaryAgreement?.created_by ||
    null

  let assignedAgent: ClientMatterContext['assignedAgent'] = null
  if (assigneeId) {
    const { data: userRow } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', assigneeId)
      .maybeSingle()
    if (userRow) {
      assignedAgent = { id: userRow.id, name: userRow.full_name || 'Agent' }
    }
  }

  const priority = primaryApproval?.priority || null

  let notesCount = 0
  if (selectedMatter) {
    const { count } = await supabase
      .from('file_notes')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('file_source', selectedMatter.source)
      .eq('file_id', selectedMatter.id)
    notesCount = count || 0
  }

  const signals = scope?.signals || {
    hasSignedServiceAgreement: false,
    hasClientSignedApproval: false,
    hasLodgedApplication: false,
    hasAcknowledgedStatementOfService: false,
  }
  const gates = scope?.gates || []
  const complete = scope?.isComplete || false
  const allMattersComplete = areAllClientMattersComplete(matters, agreements, approvals, statements)

  let matterCompletion: ClientMatterContext['matterCompletion'] = null
  if (complete && primaryApproval) {
    let completedByName: string | null = null
    if (primaryApproval.matter_completed_by) {
      const { data: completer } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', primaryApproval.matter_completed_by)
        .maybeSingle()
      completedByName = completer?.full_name || null
    }
    matterCompletion = {
      completedAt: primaryApproval.matter_completed_at || null,
      completedByName,
    }
  }

  const complianceItems: MatterComplianceItem[] = gates.map((g) => ({
    id: g.id,
    label: g.label,
    status: complianceItemStatus(g.met),
  }))

  const completed = gates.filter((g) => g.met).length
  const total = gates.length
  const scorePercent = total ? Math.round((completed / total) * 100) : 0

  const currentStage = scope ? deriveMatterCurrentStage(scope) : 'Service Agreement'
  const matterStatus = scope ? deriveMatterStatus(scope) : 'Open'

  const workflowTimeline = scope
    ? buildMatterWorkflowTimeline(scope, notesCount)
    : []

  const nextAction = scope
    ? deriveMatterNextAction(scope, { clientId, workspacePrefix: prefix })
    : {
        label: 'Create Service Agreement',
        description: 'Start this matter with a service agreement.',
        href: `${prefix}/agreements/new?clientId=${clientId}`,
        tone: 'primary' as const,
      }

  return {
    matters,
    selectedMatter,
    fileNumber,
    clientNumber: clientRow?.client_number || null,
    matterType,
    visaSubclass,
    visaStream,
    assignedAgent,
    currentStage,
    matterStatus,
    priority,
    compliance: { completed, total, scorePercent, items: complianceItems },
    workflowTimeline,
    nextAction,
    isComplete: complete,
    allMattersComplete,
    matterCompletion,
  }
}
