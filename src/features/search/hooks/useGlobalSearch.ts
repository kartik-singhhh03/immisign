"use client"

import * as React from 'react'
import type {
  GlobalSearchResponse,
  SavedSearchEntry,
  SearchFilters,
  SearchHistoryEntry,
} from '../types/search.types'

const DEBOUNCE_MS = 200

export function useGlobalSearch() {
  const [query, setQuery] = React.useState('')
  const [filters, setFilters] = React.useState<SearchFilters>({})
  const [data, setData] = React.useState<GlobalSearchResponse | null>(null)
  const [recent, setRecent] = React.useState<SearchHistoryEntry[]>([])
  const [saved, setSaved] = React.useState<SavedSearchEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  const fetchMeta = React.useCallback(async () => {
    try {
      const res = await fetch('/api/search?meta=1')
      const json = await res.json()
      if (json.success) {
        setRecent(json.recent || [])
        setSaved(json.saved || [])
        if (json.quickActions?.length) {
          setData((prev) =>
            prev
              ? { ...prev, quickActions: json.quickActions }
              : {
                  success: true,
                  query: '',
                  sections: [],
                  quickActions: json.quickActions,
                  totalCount: 0,
                  timingMs: 0,
                },
          )
        }
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  React.useEffect(() => {
    const q = query.trim()
    const hasFilters = Object.keys(filters).length > 0

    if (!q && !hasFilters) {
      setData(null)
      setLoading(false)
      return
    }

    if (q.length < 1 && !hasFilters) return

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ meta: '1' })
        if (q) params.set('q', q)
        if (hasFilters) params.set('filters', JSON.stringify(filters))

        const res = await fetch(`/api/search?${params}`, { signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Search failed')
        setData(json)
        setRecent(json.recent || [])
        setSaved(json.saved || [])
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query, filters])

  const trackClick = React.useCallback(
    async (payload: {
      query: string
      results_count: number
      clicked_result_type?: string
      clicked_result_id?: string
      clicked_result_label?: string
    }) => {
      fetch('/api/search/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    },
    [],
  )

  const saveCurrentSearch = React.useCallback(
    async (name: string) => {
      const res = await fetch('/api/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, query, filters }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved((prev) => [json.saved, ...prev])
      return json.saved
    },
    [query, filters],
  )

  const deleteSaved = React.useCallback(async (id: string) => {
    await fetch(`/api/search/saved?id=${id}`, { method: 'DELETE' })
    setSaved((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearRecent = React.useCallback(async () => {
    await fetch('/api/search/history', { method: 'DELETE' })
    setRecent([])
  }, [])

  return {
    query,
    setQuery,
    filters,
    setFilters,
    data,
    recent,
    saved,
    loading,
    error,
    fetchMeta,
    trackClick,
    saveCurrentSearch,
    deleteSaved,
    clearRecent,
  }
}
