"use client"

import type { SearchSection as SearchSectionType } from '../types/search.types'
import { SearchSection } from './SearchSection'

type Props = {
  sections: SearchSectionType[]
  selectedId?: string
  onSelect: (id: string, type: string) => void
  loading?: boolean
  emptyMessage?: string
}

export function SearchResults({
  sections,
  selectedId,
  onSelect,
  loading,
  emptyMessage = 'No results found.',
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm font-medium text-[#5C5C5C]">
        Searching…
      </div>
    )
  }

  if (!sections.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm font-medium text-[#5C5C5C]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <SearchSection
          key={section.key}
          section={section}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
