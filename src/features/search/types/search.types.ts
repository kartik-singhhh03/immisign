export type SearchEntityType =
  | 'client'
  | 'matter'
  | 'agreement'
  | 'approval'
  | 'document'
  | 'file_note'
  | 'sos'
  | 'notification'
  | 'activity'
  | 'command'
  | 'navigation'

export type SearchSectionKey =
  | 'commands'
  | 'clients'
  | 'matters'
  | 'agreements'
  | 'approvals'
  | 'documents'
  | 'file_notes'
  | 'sos'
  | 'notifications'
  | 'activity'

export type SearchFilters = {
  entity?: SearchEntityType
  signed?: boolean
  stage?: string
  approval_status?: string
  created?: 'today' | 'week' | 'month'
  assigned_to_me?: boolean
}

export type SearchResultItem = {
  id: string
  type: SearchEntityType
  label: string
  sublabel?: string
  meta?: string
  href: string
  score: number
  clientId?: string
  fileId?: string
  fileSource?: 'agreement' | 'application_approval'
  fileNumber?: string
  matterType?: string | null
  visaSubclass?: string | null
  stage?: string | null
  compliance?: { completed: number; total: number; scorePercent: number }
  assignedAgent?: string | null
  icon?: string
}

export type SearchSection = {
  key: SearchSectionKey
  title: string
  items: SearchResultItem[]
}

export type QuickAction = {
  id: string
  label: string
  description?: string
  href: string
  keywords: string[]
}

export type GlobalSearchResponse = {
  success: boolean
  query: string
  sections: SearchSection[]
  quickActions: QuickAction[]
  filters?: SearchFilters
  totalCount: number
  timingMs: number
}

export type SearchHistoryEntry = {
  id: string
  query: string
  result_count: number
  created_at: string
}

export type SavedSearchEntry = {
  id: string
  name: string
  query: string
  filters: SearchFilters
  created_at: string
  updated_at: string
}

export type SearchAnalyticsPayload = {
  query: string
  results_count: number
  clicked_result_type?: string
  clicked_result_id?: string
  clicked_result_label?: string
}
