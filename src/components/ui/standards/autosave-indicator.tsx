"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Cloud, CloudOff, Loader2 } from "lucide-react"

export type AutosaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error"

export function AutosaveIndicator({
  status,
  lastSavedAt,
  className,
}: {
  status: AutosaveStatus
  lastSavedAt?: Date | null
  className?: string
}) {
  const label = React.useMemo(() => {
    if (status === "saving") return "Saving..."
    if (status === "unsaved") return "Unsaved changes"
    if (status === "error") return "Draft save failed"
    if (status === "saved" && lastSavedAt) {
      const sec = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
      if (sec < 8) return "Saved just now"
      if (sec < 60) return `Saved ${sec}s ago`
      return `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }
    return "Draft autosave on"
  }, [status, lastSavedAt])

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        status === "saved" && "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]",
        status === "saving" && "border-slate-200 bg-slate-50 text-slate-600",
        status === "unsaved" && "border-amber-100 bg-amber-50/80 text-amber-800",
        status === "error" && "border-red-100 bg-red-50 text-red-700",
        status === "idle" && "border-slate-200 bg-white text-slate-500",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {status === "saving" ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : status === "error" ? (
        <CloudOff className="h-3 w-3" aria-hidden />
      ) : (
        <Cloud className="h-3 w-3" aria-hidden />
      )}
      {label}
    </div>
  )
}
