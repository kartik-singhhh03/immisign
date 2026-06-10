"use client"

import { cn } from "@/lib/utils"
import type { NotificationRecord } from "@/lib/notifications/types"
import {
  formatDueLabel,
  getPriorityStyle,
  relativeTime,
} from "../utils/notification-ui"

type Props = {
  notification: NotificationRecord
  selected: boolean
  active: boolean
  onSelect: () => void
  onToggleCheck: () => void
}

export function NotificationCard({
  notification: n,
  selected,
  active,
  onSelect,
  onToggleCheck,
}: Props) {
  const styles = getPriorityStyle(n.priority)
  const dueLabel = formatDueLabel(n.due_at)
  const isOverdue = dueLabel?.includes("overdue")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group flex gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200",
        "hover:border-[#111111]/15 hover:shadow-[0_2px_12px_rgba(17,17,17,0.06)]",
        active
          ? "border-[#111111]/20 bg-white shadow-[0_2px_12px_rgba(17,17,17,0.08)]"
          : "border-[#E7E7E7] bg-[#FAFAFA]",
        !n.is_read && "bg-white",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => {
          e.stopPropagation()
          onToggleCheck()
        }}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[#E7E7E7] text-[#111111]"
        aria-label={`Select ${n.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm text-[#111111]",
                !n.is_read ? "font-semibold" : "font-medium",
              )}
            >
              {n.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#5C5C5C]">
              {n.message}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {relativeTime(n.created_at)}
          </span>
          {dueLabel && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                isOverdue
                  ? "bg-red-50 text-red-700"
                  : "bg-[#F8F8F8] text-[#5C5C5C]",
              )}
            >
              {dueLabel}
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {n.scope || "personal"}
          </span>
        </div>
      </div>
    </div>
  )
}
