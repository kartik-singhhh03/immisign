"use client"

import * as React from 'react'
import {
  FileSignature,
  FileText,
  Users,
  FolderOpen,
  FileCheck2,
  StickyNote,
  ScrollText,
  Bell,
  Activity,
  Plus,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchEntityType, SearchResultItem } from '../types/search.types'

const ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  client: Users,
  matter: Briefcase,
  agreement: FileSignature,
  approval: FileCheck2,
  document: FolderOpen,
  file_note: StickyNote,
  sos: ScrollText,
  notification: Bell,
  activity: Activity,
  command: Plus,
  navigation: FileText,
}

type Props = {
  item: SearchResultItem
  selected?: boolean
  onSelect: () => void
}

export function SearchResultCard({ item, selected, onSelect }: Props) {
  const Icon = ICONS[item.type] || FileText

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-[#111111]/20 bg-[#F8F8F8] shadow-sm'
          : 'border-transparent bg-white hover:border-[#E7E7E7] hover:bg-[#FAFAFA]',
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F8F8] text-[#111111]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#111111]">{item.label}</p>
        {item.sublabel && (
          <p className="mt-0.5 truncate text-xs font-medium text-[#5C5C5C]">{item.sublabel}</p>
        )}
        {item.type === 'matter' && item.compliance && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#5C5C5C]">
            Compliance {item.compliance.completed}/{item.compliance.total}
            {item.stage ? ` · ${item.stage}` : ''}
          </p>
        )}
        {item.meta && item.type !== 'matter' && (
          <p className="mt-0.5 truncate text-[10px] font-medium text-[#5C5C5C]">{item.meta}</p>
        )}
      </div>
    </button>
  )
}
