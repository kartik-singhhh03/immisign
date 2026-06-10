"use client"

import { Clock, X } from 'lucide-react'
import type { SearchHistoryEntry } from '../types/search.types'

type Props = {
  items: SearchHistoryEntry[]
  onSelect: (query: string) => void
  onClear?: () => void
}

export function RecentSearches({ items, onSelect, onClear }: Props) {
  if (!items.length) return null

  return (
    <section aria-label="Recent searches" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
          Recent Searches
        </h3>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-semibold text-[#5C5C5C] hover:text-[#111111]"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.query)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E7E7] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111]/20 hover:bg-[#FAFAFA]"
          >
            <Clock className="h-3 w-3 text-[#5C5C5C]" />
            {item.query}
          </button>
        ))}
      </div>
    </section>
  )
}
