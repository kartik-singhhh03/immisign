import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SavedSearchEntry,
  SearchAnalyticsPayload,
  SearchHistoryEntry,
  SearchFilters,
} from '../types/search.types'

export class SearchAnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async recordHistory(
    agencyId: string,
    userId: string,
    query: string,
    resultCount: number,
  ): Promise<void> {
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    await this.supabase.from('search_history').insert({
      agency_id: agencyId,
      user_id: userId,
      query: trimmed,
      result_count: resultCount,
    })

    // Keep only last 50 per user (prune older)
    const { data: old } = await this.supabase
      .from('search_history')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(50, 200)

    if (old?.length) {
      await this.supabase
        .from('search_history')
        .delete()
        .in('id', old.map((r) => r.id))
    }
  }

  async getRecentSearches(
    agencyId: string,
    userId: string,
    limit = 10,
  ): Promise<SearchHistoryEntry[]> {
    const { data } = await this.supabase
      .from('search_history')
      .select('id, query, result_count, created_at')
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data || []).map((r) => ({
      id: r.id,
      query: r.query,
      result_count: r.result_count,
      created_at: r.created_at,
    }))
  }

  async clearHistory(agencyId: string, userId: string): Promise<void> {
    await this.supabase
      .from('search_history')
      .delete()
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
  }

  async getSavedSearches(
    agencyId: string,
    userId: string,
  ): Promise<SavedSearchEntry[]> {
    const { data } = await this.supabase
      .from('saved_searches')
      .select('id, name, query, filters, created_at, updated_at')
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      query: r.query,
      filters: (r.filters || {}) as SearchFilters,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))
  }

  async saveSearch(
    agencyId: string,
    userId: string,
    name: string,
    query: string,
    filters: SearchFilters = {},
  ): Promise<SavedSearchEntry> {
    const { data, error } = await this.supabase
      .from('saved_searches')
      .insert({
        agency_id: agencyId,
        user_id: userId,
        name,
        query,
        filters,
      })
      .select('id, name, query, filters, created_at, updated_at')
      .single()

    if (error || !data) throw new Error(error?.message || 'Failed to save search')

    return {
      id: data.id,
      name: data.name,
      query: data.query,
      filters: (data.filters || {}) as SearchFilters,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  async deleteSavedSearch(
    agencyId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    await this.supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
  }

  async trackClick(
    agencyId: string,
    userId: string,
    payload: SearchAnalyticsPayload,
  ): Promise<void> {
    await this.supabase.from('search_analytics').insert({
      agency_id: agencyId,
      user_id: userId,
      query: payload.query,
      results_count: payload.results_count,
      clicked_result_type: payload.clicked_result_type || null,
      clicked_result_id: payload.clicked_result_id || null,
      clicked_result_label: payload.clicked_result_label || null,
    })
  }
}
