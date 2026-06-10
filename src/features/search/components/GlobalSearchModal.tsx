"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, BookmarkPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useRequireWorkspace } from '@/lib/hooks/use-workspace'
import { useCommandPalette } from '../hooks/useCommandPalette'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
import { SearchResults } from './SearchResults'
import { RecentSearches } from './RecentSearches'
import { SavedSearches } from './SavedSearches'
import { QuickActions } from './QuickActions'
import { SearchFilters } from './SearchFilters'
import type { SearchResultItem } from '../types/search.types'

function flattenItems(
  sections: { items: SearchResultItem[] }[] | undefined,
): SearchResultItem[] {
  return sections?.flatMap((s) => s.items) || []
}

export function GlobalSearchModal() {
  const router = useRouter()
  const { slug } = useRequireWorkspace()
  const { open, setOpen } = useCommandPalette()
  const {
    query,
    setQuery,
    filters,
    setFilters,
    data,
    recent,
    saved,
    loading,
    fetchMeta,
    trackClick,
    saveCurrentSearch,
    deleteSaved,
    clearRecent,
  } = useGlobalSearch()

  const inputRef = React.useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [saveName, setSaveName] = React.useState('')
  const [showSave, setShowSave] = React.useState(false)

  const flatItems = React.useMemo(() => flattenItems(data?.sections), [data?.sections])
  const quickActions = data?.quickActions || []

  React.useEffect(() => {
    if (open) {
      fetchMeta()
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setQuery('')
      setFilters({})
      setShowSave(false)
      setSaveName('')
    }
  }, [open, fetchMeta, setQuery, setFilters])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query, data?.sections])

  const execute = React.useCallback(
    (href: string, item?: SearchResultItem) => {
      if (item) {
        trackClick({
          query,
          results_count: data?.totalCount || 0,
          clicked_result_type: item.type,
          clicked_result_id: item.id,
          clicked_result_label: item.label,
        })
      }
      setOpen(false)
      router.push(href)
    },
    [query, data?.totalCount, trackClick, setOpen, router],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = flatItems.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (total) setSelectedIndex((i) => (i + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (total) setSelectedIndex((i) => (i - 1 + total) % total)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[selectedIndex]
      if (item) execute(item.href, item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const selectedId =
    flatItems[selectedIndex]
      ? `${flatItems[selectedIndex].type}-${flatItems[selectedIndex].id}`
      : undefined

  if (!slug) return null

  const showIdle = !query.trim() && !Object.keys(filters).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-[#F8F8F8] p-0 shadow-none sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-[#E7E7E7] sm:bg-white sm:shadow-2xl"
        onKeyDown={handleKeyDown}
        aria-label="ImmiMate Command Center"
      >
        <DialogTitle className="sr-only">Global search</DialogTitle>
        {/* Sticky search header */}
        <div className="sticky top-0 z-10 border-b border-[#E7E7E7] bg-white px-4 py-4 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-[#5C5C5C]" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={open}
              aria-controls="search-results"
              aria-autocomplete="list"
              placeholder="Search clients, matters, documents, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-base font-medium text-[#111111] outline-none placeholder:text-[#5C5C5C]"
            />
            <kbd className="hidden rounded border border-[#E7E7E7] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#5C5C5C] sm:inline-block">
              ESC
            </kbd>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#111111]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 font-serif text-lg font-normal tracking-tight text-[#111111]">
            ImmiMate Command Center
          </p>
          <div className="mt-3">
            <SearchFilters
              active={filters}
              onApply={(q, f) => {
                setQuery(q)
                setFilters(f)
              }}
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div
          id="search-results"
          role="listbox"
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 immimate-scroll"
        >
          {showIdle ? (
            <div className="space-y-6">
              <RecentSearches
                items={recent}
                onSelect={(q) => setQuery(q)}
                onClear={() => void clearRecent()}
              />
              <SavedSearches
                items={saved}
                onSelect={(entry) => {
                  setQuery(entry.query)
                  setFilters(entry.filters)
                }}
                onDelete={(id) => void deleteSaved(id)}
              />
              <QuickActions
                actions={quickActions}
                onAction={(href, label) => {
                  trackClick({
                    query: '',
                    results_count: 0,
                    clicked_result_type: 'command',
                    clicked_result_label: label,
                  })
                  setOpen(false)
                  router.push(href)
                }}
              />
            </div>
          ) : (
            <>
              <SearchResults
                sections={data?.sections || []}
                selectedId={selectedId}
                loading={loading}
                onSelect={(id, type) => {
                  const item = flatItems.find((x) => x.id === id && x.type === type)
                  if (item) execute(item.href, item)
                }}
              />
              {data && data.totalCount > 0 && (
                <p className="mt-4 text-center text-[10px] font-medium text-[#5C5C5C]">
                  {data.totalCount} result{data.totalCount === 1 ? '' : 's'} · {data.timingMs}ms
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E7E7E7] bg-white px-4 py-3 sm:rounded-b-2xl">
          {showIdle ? (
            <p className="text-center text-[10px] font-medium text-[#5C5C5C]">
              Press <kbd className="rounded border border-[#E7E7E7] px-1 font-mono">⌘K</kbd> anywhere to open
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-medium text-[#5C5C5C]">
                <span>↑↓ navigate</span>
                <span>·</span>
                <span>↵ open</span>
                <span>·</span>
                <span>esc close</span>
              </div>
              {query.trim().length >= 2 && (
                <div className="flex items-center gap-2">
                  {showSave ? (
                    <>
                      <input
                        type="text"
                        placeholder="Search name…"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="h-8 rounded-lg border border-[#E7E7E7] px-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!saveName.trim()}
                        onClick={() => {
                          void saveCurrentSearch(saveName.trim()).then(() => {
                            setShowSave(false)
                            setSaveName('')
                          })
                        }}
                        className="rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSave(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E7E7E7] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#FAFAFA]"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Save Search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

