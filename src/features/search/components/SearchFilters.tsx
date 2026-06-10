"use client"

import { cn } from '@/lib/utils'
import type { SearchFilters as SearchFiltersType } from '../types/search.types'

const PRESETS: { label: string; filters: SearchFiltersType; query?: string }[] = [
  { label: 'Awaiting Approval', filters: { approval_status: 'pending' }, query: 'show awaiting approval' },
  { label: 'Ready To Lodge', filters: { stage: 'ready_to_lodge' }, query: 'ready to lodge' },
  { label: 'Unsigned Agreements', filters: { entity: 'agreement', signed: false }, query: 'unsigned agreements' },
  { label: 'My Matters', filters: { assigned_to_me: true }, query: 'my matters' },
  { label: "Today's Notes", filters: { entity: 'file_note', created: 'today' }, query: 'today notes' },
]

type Props = {
  active?: SearchFiltersType
  onApply: (query: string, filters: SearchFiltersType) => void
}

export function SearchFilters({ active, onApply }: Props) {
  const isActive = (preset: (typeof PRESETS)[0]) => {
    if (!active) return false
    return JSON.stringify(active) === JSON.stringify(preset.filters)
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Search filters">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onApply(preset.query || '', preset.filters)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            isActive(preset)
              ? 'border-[#111111] bg-[#111111] text-white'
              : 'border-[#E7E7E7] bg-white text-[#5C5C5C] hover:border-[#111111]/20 hover:text-[#111111]',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
