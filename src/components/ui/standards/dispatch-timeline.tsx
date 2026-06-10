"use client"

import * as React from "react"
import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DispatchStageRecord, DispatchStageStatus } from "@/lib/dispatch/stage-tracker"

function formatTime(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function StatusIcon({ status }: { status: DispatchStageStatus }) {
  if (status === "success")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111]">
        <Check className="h-4 w-4" />
      </span>
    )
  if (status === "running")
    return <Loader2 className="h-7 w-7 text-[#111111] animate-spin" />
  if (status === "failed")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-700">
        <X className="h-4 w-4" />
      </span>
    )
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[11px] font-bold text-slate-400">
      ···
    </span>
  )
}

export type DispatchTimelineProps = {
  title: string
  subtitle?: string
  stages: DispatchStageRecord[]
  supportRef?: string
  className?: string
}

export function DispatchTimeline({
  title,
  subtitle,
  stages,
  supportRef,
  className,
}: DispatchTimelineProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div>
        <h3 className="text-lg font-bold text-[#111111]">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
        {supportRef && (
          <p className="text-[10px] font-mono text-slate-400 mt-2">Reference: {supportRef}</p>
        )}
      </div>
      <ol className="space-y-2">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={cn(
              "flex gap-3 rounded-xl border px-4 py-3",
              stage.status === "success" && "border-[#E7E7E7] bg-[#FAFAFA]/40",
              stage.status === "running" && "border-[#111111]/30 bg-[#FAFAFA]",
              stage.status === "failed" && "border-red-200 bg-red-50/60",
              stage.status === "pending" && "border-slate-100 bg-slate-50/40 opacity-80",
            )}
          >
            <div className="shrink-0 pt-0.5">
              <StatusIcon status={stage.status} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111111]">{stage.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium tabular-nums">
                {stage.status === "pending" && "Pending"}
                {stage.status === "running" && stage.startedAt && `Running · ${formatTime(stage.startedAt)}`}
                {stage.status === "success" &&
                  stage.completedAt &&
                  `Completed ${formatTime(stage.completedAt)}${stage.durationMs != null ? ` · ${stage.durationMs}ms` : ""}`}
                {stage.status === "failed" && (
                  <span className="text-red-700">{stage.error || "Failed"}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
