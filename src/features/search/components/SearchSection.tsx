"use client"

import type { SearchSection as SearchSectionType } from '../types/search.types'
import { SearchResultCard } from './SearchResultCard'

type Props = {
  section: SearchSectionType
  selectedId?: string
  onSelect: (id: string, type: string) => void
}

export function SearchSection({ section, selectedId, onSelect }: Props) {
  return (
    <section aria-label={section.title} className="space-y-1">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
        {section.title}
      </h3>
      <div className="space-y-1">
        {section.items.map((item) => (
          <SearchResultCard
            key={`${item.type}-${item.id}`}
            item={item}
            selected={selectedId === `${item.type}-${item.id}`}
            onSelect={() => onSelect(item.id, item.type)}
          />
        ))}
      </div>
    </section>
  )
}
