"use client"

import { Bookmark, X } from 'lucide-react'
import type { SavedSearchEntry } from '../types/search.types'

type Props = {
  items: SavedSearchEntry[]
  onSelect: (entry: SavedSearchEntry) => void
  onDelete?: (id: string) => void
}

export function SavedSearches({ items, onSelect, onDelete }: Props) {
  if (!items.length) return null

  return (
    <section aria-label="Saved searches" className="space-y-2">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
        Saved Searches
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-[#E7E7E7] bg-white px-3 py-2"
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-[#111111] hover:text-[#1C1C1C]"
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0 text-[#5C5C5C]" />
              <span className="truncate">{item.name}</span>
              <span className="truncate text-xs text-[#5C5C5C]">{item.query}</span>
            </button>
            {onDelete && (
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onDelete(item.id)}
                className="shrink-0 rounded p-1 text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#111111]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
