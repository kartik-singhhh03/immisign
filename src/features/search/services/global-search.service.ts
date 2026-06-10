import type { SupabaseClient } from '@supabase/supabase-js'
import { filterProductionClients } from '@/lib/data/production-filters'
import { buildMatterClientPath } from '@/features/clients/lib/matter-scope'
import { ClientSearchService } from '@/features/file-notes/services/client-search.service'
import {
  matchCommandAction,
  parseNaturalLanguage,
  scoreMatch,
  sortByScore,
} from '../utils/search-ranking'
import type {
  GlobalSearchResponse,
  QuickAction,
  SearchFilters,
  SearchResultItem,
  SearchSection,
  SearchSectionKey,
} from '../types/search.types'

const SECTION_ORDER: SearchSectionKey[] = [
  'commands',
  'clients',
  'matters',
  'agreements',
  'approvals',
  'documents',
  'file_notes',
  'sos',
  'notifications',
  'activity',
]

const SECTION_TITLES: Record<SearchSectionKey, string> = {
  commands: 'Commands',
  clients: 'Clients',
  matters: 'Matters',
  agreements: 'Agreements',
  approvals: 'Application Approvals',
  documents: 'Documents',
  file_notes: 'File Notes',
  sos: 'Statements of Service',
  notifications: 'Notifications',
  activity: 'Activity',
}

export function buildQuickActions(prefix: string): QuickAction[] {
  return [
    { id: 'create-client', label: 'Create Client', description: 'Start unified intake', href: `${prefix}/onboarding/new`, keywords: ['new client', 'create client', 'add client'] },
    { id: 'create-agreement', label: 'Create Agreement', description: 'New service agreement', href: `${prefix}/agreements/new`, keywords: ['new agreement', 'create agreement', 'send agreement'] },
    { id: 'create-approval', label: 'Create Approval', description: 'Lodgement approval workflow', href: `${prefix}/approvals/new`, keywords: ['new approval', 'create approval', 'lodgement approval'] },
    { id: 'create-sos', label: 'Create Statement of Service', description: 'Issue SOS at completion', href: `${prefix}/service-statements/new`, keywords: ['new sos', 'create sos', 'statement of service'] },
    { id: 'upload-document', label: 'Upload Document', description: 'Add to document library', href: `${prefix}/documents/upload`, keywords: ['upload document', 'add document', 'new document'] },
    { id: 'add-note', label: 'Add File Note', description: 'Compliance case notes', href: `${prefix}/file-notes`, keywords: ['new note', 'add note', 'file note', 'create note'] },
  ]
}

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export class GlobalSearchService {
  private clientSearch: ClientSearchService

  constructor(private supabase: SupabaseClient) {
    this.clientSearch = new ClientSearchService(supabase)
  }

  async search(params: {
    agencyId: string
    agencySlug: string
    userId: string
    query: string
    limit?: number
    filters?: SearchFilters
  }): Promise<GlobalSearchResponse> {
    const start = Date.now()
    const limit = params.limit ?? 8
    const prefix = `/workspace/${params.agencySlug}`
    const quickActions = buildQuickActions(prefix)

    const { cleanedQuery, filters: nlFilters } = parseNaturalLanguage(params.query)
    const filters: SearchFilters = { ...nlFilters, ...params.filters }
    const q = (cleanedQuery || params.query).trim()

    const sectionsMap = new Map<SearchSectionKey, SearchResultItem[]>()

    const addItem = (key: SearchSectionKey, item: SearchResultItem) => {
      const list = sectionsMap.get(key) || []
      if (list.some((x) => x.type === item.type && x.id === item.id)) return
      list.push(item)
      sectionsMap.set(key, list)
    }

    // Command matches (always evaluate)
    if (q.length >= 1) {
      const matched = matchCommandAction(q, quickActions)
      for (const action of matched) {
        addItem('commands', {
          id: action.id,
          type: 'command',
          label: `+ ${action.label}`,
          sublabel: action.description,
          href: action.href,
          score: scoreMatch(q, action.label, 'command'),
        })
      }
    }

    // Filter-only NL queries (no text)
    const searchText = q.length >= 1 ? q : ''
    const pattern = searchText ? `%${searchText}%` : '%'

    if (!searchText && !Object.keys(filters).length) {
      return {
        success: true,
        query: params.query,
        sections: [],
        quickActions,
        filters,
        totalCount: 0,
        timingMs: Date.now() - start,
      }
    }

    const matterService = this.clientSearch

    const parallel: Promise<void>[] = []

    // Matters (includes client context)
    if (!filters.entity || filters.entity === 'matter' || filters.entity === 'client') {
      parallel.push(
        (async () => {
          let matters = await matterService.searchMatters(
            params.agencyId,
            searchText || ' ',
            params.agencySlug,
            limit * 2,
          )

          if (filters.stage === 'lodged') {
            matters = matters.filter((m) => m.stage.toLowerCase().includes('lodged'))
          }
          if (filters.approval_status === 'pending') {
            matters = matters.filter((m) => m.stage.toLowerCase().includes('awaiting'))
          }
          if (filters.assigned_to_me) {
            const { data: me } = await this.supabase
              .from('users')
              .select('full_name')
              .eq('id', params.userId)
              .single()
            const myName = me?.full_name || ''
            matters = matters.filter((m) => m.assignedAgent === myName)
          }

          const seenClients = new Set<string>()
          for (const m of matters.slice(0, limit)) {
            const score = scoreMatch(searchText || m.fileNumber, m.fileNumber, 'matter')
            addItem('matters', {
              id: `${m.clientId}-${m.fileId}`,
              type: 'matter',
              label: m.fileNumber,
              sublabel: [m.clientName, m.visaSubclass, m.stage].filter(Boolean).join(' · '),
              meta: m.assignedAgent ? `Agent: ${m.assignedAgent}` : undefined,
              href: m.deepLink,
              score,
              clientId: m.clientId,
              fileId: m.fileId,
              fileSource: m.fileSource,
              fileNumber: m.fileNumber,
              matterType: m.matterType,
              visaSubclass: m.visaSubclass,
              stage: m.stage,
              compliance: m.compliance,
              assignedAgent: m.assignedAgent,
            })

            if (!seenClients.has(m.clientId)) {
              seenClients.add(m.clientId)
              addItem('clients', {
                id: m.clientId,
                type: 'client',
                label: m.clientName,
                sublabel: m.clientEmail,
                meta: m.fileNumber,
                href: m.deepLink,
                score: scoreMatch(searchText || m.clientName, m.clientName, 'client'),
                clientId: m.clientId,
                fileId: m.fileId,
                fileSource: m.fileSource,
                fileNumber: m.fileNumber,
              })
            }
          }
        })(),
      )
    }

    // Agreements
    if (!filters.entity || filters.entity === 'agreement') {
      parallel.push(
        (async () => {
          let query = this.supabase
            .from('agreements')
            .select('id, client_id, agreement_number, title, client_name, client_email, status, metadata')
            .eq('agency_id', params.agencyId)
            .neq('status', 'cancelled')
            .limit(limit)

          if (searchText) {
            query = query.or(
              `agreement_number.ilike.${pattern},title.ilike.${pattern},client_name.ilike.${pattern},client_email.ilike.${pattern}`,
            )
          }
          if (filters.signed === false) {
            query = query.not('status', 'in', '(signed,Signed,completed,Completed)')
          }
          if (filters.stage === 'lodged') {
            query = query.eq('status', 'completed')
          }

          const { data } = await query
          for (const row of data || []) {
            const label = row.agreement_number || row.title || 'Agreement'
            const score = scoreMatch(searchText || label, label, 'agreement')
            const href =
              row.client_id
                ? buildMatterClientPath(params.agencySlug, row.client_id, 'agreement', row.id, 'service_agreement')
                : `${prefix}/agreements/${row.id}`
            addItem('agreements', {
              id: row.id,
              type: 'agreement',
              label,
              sublabel: [row.client_name, row.status].filter(Boolean).join(' · '),
              href,
              score,
              clientId: row.client_id || undefined,
              fileId: row.id,
              fileSource: 'agreement',
              fileNumber: row.agreement_number || undefined,
            })
          }
        })(),
      )
    }

    // Application approvals
    if (!filters.entity || filters.entity === 'approval') {
      parallel.push(
        (async () => {
          let query = this.supabase
            .from('application_approvals')
            .select('id, client_id, approval_number, title, visa_subclass, visa_stream, status, client_name')
            .eq('agency_id', params.agencyId)
            .is('deleted_at', null)
            .limit(limit)

          if (searchText) {
            query = query.or(
              `approval_number.ilike.${pattern},title.ilike.${pattern},visa_subclass.ilike.${pattern},visa_stream.ilike.${pattern}`,
            )
          }
          if (filters.approval_status === 'pending') {
            query = query.in('status', ['pending', 'under_review', 'Pending Review', 'sent'])
          }
          if (filters.stage === 'ready_to_lodge') {
            query = query.not('ready_to_lodge_at', 'is', null)
          }
          if (filters.stage === 'lodged') {
            query = query.not('lodged_at', 'is', null)
          }

          const { data } = await query
          for (const row of data || []) {
            const label = row.approval_number || row.title || 'Approval'
            const score = scoreMatch(searchText || label, label, 'approval')
            const href =
              row.client_id
                ? buildMatterClientPath(params.agencySlug, row.client_id, 'application_approval', row.id, 'approval')
                : `${prefix}/approvals/${row.id}`
            addItem('approvals', {
              id: row.id,
              type: 'approval',
              label,
              sublabel: [row.client_name, row.visa_subclass, row.status].filter(Boolean).join(' · '),
              href,
              score,
              clientId: row.client_id || undefined,
              fileId: row.id,
              fileSource: 'application_approval',
              fileNumber: row.approval_number || undefined,
              visaSubclass: row.visa_subclass,
            })
          }
        })(),
      )
    }

    // Direct client search (when not only matter-filtered)
    if (searchText && (!filters.entity || filters.entity === 'client')) {
      parallel.push(
        (async () => {
          const { data } = await this.supabase
            .from('clients')
            .select('id, name, email, phone, client_number')
            .eq('agency_id', params.agencyId)
            .or(
              `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},client_number.ilike.${pattern}`,
            )
            .limit(limit)

          for (const c of filterProductionClients(data || [])) {
            const score = scoreMatch(searchText, c.name, 'client')
            addItem('clients', {
              id: c.id,
              type: 'client',
              label: c.name,
              sublabel: [c.email, c.client_number].filter(Boolean).join(' · '),
              href: `${prefix}/clients/${c.id}`,
              score,
              clientId: c.id,
            })
          }
        })(),
      )
    }

    // Documents
    if (!filters.entity || filters.entity === 'document') {
      parallel.push(
        (async () => {
          let query = this.supabase
            .from('documents')
            .select('id, file_name, original_name, signwell_status, status, agreement_id')
            .eq('agency_id', params.agencyId)
            .limit(limit)

          if (searchText) query = query.ilike('file_name', pattern)

          const { data } = await query
          for (const d of data || []) {
            const label = d.file_name || d.original_name || 'Document'
            addItem('documents', {
              id: d.id,
              type: 'document',
              label,
              sublabel: d.signwell_status || d.status || undefined,
              href: `${prefix}/documents/library`,
              score: scoreMatch(searchText || label, label, 'document'),
            })
          }
        })(),
      )
    }

    // File notes
    if (!filters.entity || filters.entity === 'file_note') {
      parallel.push(
        (async () => {
          let query = this.supabase
            .from('file_notes')
            .select('id, client_id, body, note_type, file_source, file_id, recorded_at, clients(name)')
            .eq('agency_id', params.agencyId)
            .order('recorded_at', { ascending: false })
            .limit(limit)

          if (searchText) query = query.ilike('body', pattern)
          if (filters.created === 'today') query = query.gte('recorded_at', todayStart())

          const { data } = await query
          for (const n of data || []) {
            const body = (n.body || '').slice(0, 80)
            const clientName = (n.clients as { name?: string } | null)?.name
            const href =
              n.client_id && n.file_source && n.file_id
                ? buildMatterClientPath(params.agencySlug, n.client_id, n.file_source, n.file_id, 'file_notes')
                : n.client_id
                  ? `${prefix}/clients/${n.client_id}?tab=file_notes`
                  : `${prefix}/file-notes`
            addItem('file_notes', {
              id: n.id,
              type: 'file_note',
              label: body || 'File note',
              sublabel: [clientName, n.note_type].filter(Boolean).join(' · '),
              href,
              score: scoreMatch(searchText || body, body, 'file_note'),
              clientId: n.client_id,
              fileId: n.file_id || undefined,
              fileSource: n.file_source || undefined,
            })
          }
        })(),
      )
    }

    // SOS
    if (!filters.entity || filters.entity === 'sos') {
      parallel.push(
        (async () => {
          let query = this.supabase
            .from('service_statements')
            .select('id, client_id, statement_number, matter_reference, visa_subclass, status, clients(name)')
            .eq('agency_id', params.agencyId)
            .is('deleted_at', null)
            .limit(limit)

          if (searchText) {
            query = query.or(
              `statement_number.ilike.${pattern},matter_reference.ilike.${pattern},visa_subclass.ilike.${pattern}`,
            )
          }

          const { data } = await query
          for (const s of data || []) {
            const label = s.statement_number || s.matter_reference || 'Statement of Service'
            const clientName = (s.clients as { name?: string } | null)?.name
            addItem('sos', {
              id: s.id,
              type: 'sos',
              label,
              sublabel: [clientName, s.status].filter(Boolean).join(' · '),
              href: s.client_id
                ? `${prefix}/clients/${s.client_id}?tab=statement_of_service`
                : `${prefix}/service-statements/new`,
              score: scoreMatch(searchText || label, label, 'sos'),
              clientId: s.client_id || undefined,
            })
          }
        })(),
      )
    }

    // Notifications
    if (searchText && (!filters.entity || filters.entity === 'notification')) {
      parallel.push(
        (async () => {
          const { data } = await this.supabase
            .from('notifications')
            .select('id, title, message, action_url, created_at')
            .eq('agency_id', params.agencyId)
            .eq('user_id', params.userId)
            .or(`title.ilike.${pattern},message.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(limit)

          for (const n of data || []) {
            addItem('notifications', {
              id: n.id,
              type: 'notification',
              label: n.title,
              sublabel: (n.message || '').slice(0, 60),
              href: n.action_url || `${prefix}/dashboard`,
              score: scoreMatch(searchText, n.title, 'notification'),
            })
          }
        })(),
      )
    }

    // Activity logs
    if (searchText && (!filters.entity || filters.entity === 'activity')) {
      parallel.push(
        (async () => {
          const { data } = await this.supabase
            .from('activity_logs')
            .select('id, title, description, type, reference_id, reference_type, created_at')
            .eq('agency_id', params.agencyId)
            .or(`title.ilike.${pattern},description.ilike.${pattern},type.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(limit)

          for (const a of data || []) {
            addItem('activity', {
              id: a.id,
              type: 'activity',
              label: a.title,
              sublabel: a.type,
              href: `${prefix}/activity`,
              score: scoreMatch(searchText, a.title, 'activity'),
            })
          }
        })(),
      )
    }

    await Promise.all(parallel)

    const sections: SearchSection[] = SECTION_ORDER.flatMap((key) => {
      const items = sortByScore(sectionsMap.get(key) || []).slice(0, limit)
      if (!items.length) return []
      return [{ key, title: SECTION_TITLES[key], items }]
    })

    const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0)

    return {
      success: true,
      query: params.query,
      sections,
      quickActions,
      filters: Object.keys(filters).length ? filters : undefined,
      totalCount,
      timingMs: Date.now() - start,
    }
  }
}
