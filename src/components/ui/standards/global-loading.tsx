"use client"

import * as React from "react"
import { ImmiMateSkeleton } from "@/components/ui/skeleton"
import { useAsyncTaskStore } from "@/lib/ux/async-task-store"
import { cn } from "@/lib/utils"

export function GlobalLoadingOverlay() {
  const tasks = useAsyncTaskStore((s) => s.tasks)
  const overlayTasks = tasks.filter((t) => t.overlay)
  if (!overlayTasks.length) return null
  const label = overlayTasks[overlayTasks.length - 1]?.label

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111111]/25 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-xl flex items-center gap-3">
        <ImmiMateSkeleton className="h-6 w-6 rounded-full" />
        <span className="text-sm font-bold text-[#111111]">{label || "Working…"}</span>
      </div>
    </div>
  )
}

export function GlobalActionProgress({ className }: { className?: string }) {
  const tasks = useAsyncTaskStore((s) => s.tasks)
  if (!tasks.length) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[150] max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg p-3 space-y-2",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <ImmiMateSkeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
          <span className="truncate">{t.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Wrap any promise; shows overlay when duration exceeds thresholdMs (default 500). */
export async function withGlobalTask<T>(
  id: string,
  label: string,
  fn: () => Promise<T>,
  options?: { overlay?: boolean; thresholdMs?: number },
): Promise<T> {
  const threshold = options?.thresholdMs ?? 500
  const store = useAsyncTaskStore.getState()
  let shown = false
  const timer = setTimeout(() => {
    shown = true
    store.start(id, label, { overlay: options?.overlay ?? true })
  }, threshold)
  try {
    return await fn()
  } finally {
    clearTimeout(timer)
    if (shown) store.end(id)
  }
}
