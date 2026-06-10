"use client"

import { Plus } from 'lucide-react'
import type { QuickAction } from '../types/search.types'

type Props = {
  actions: QuickAction[]
  onAction: (href: string, label: string) => void
}

export function QuickActions({ actions, onAction }: Props) {
  if (!actions.length) return null

  return (
    <section aria-label="Quick actions" className="border-t border-[#E7E7E7] pt-4">
      <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
        Quick Actions
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.href, action.label)}
            className="flex items-center gap-3 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] px-4 py-3 text-left transition-colors hover:border-[#111111]/15 hover:bg-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-white">
              <Plus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111111]">{action.label}</p>
              {action.description && (
                <p className="truncate text-xs text-[#5C5C5C]">{action.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
