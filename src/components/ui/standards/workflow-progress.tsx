"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type WorkflowStep = {
  id: string
  label: string
  description?: string
}

export type WorkflowProgressProps = {
  title: string
  subtitle?: string
  steps: WorkflowStep[]
  /** Index of step currently in progress; steps before are done */
  activeIndex: number
  /** Optional log lines (newest last) */
  logs?: string[]
  error?: string | null
  className?: string
}

export function WorkflowProgress({
  title,
  subtitle,
  steps,
  activeIndex,
  logs = [],
  error,
  className,
}: WorkflowProgressProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6",
        error && "border-red-200/80",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={activeIndex < steps.length && !error}
    >
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-bold text-[#111111]">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex && !error
          const pending = index > activeIndex
          return (
            <li
              key={step.id}
              className={cn(
                "flex gap-3 rounded-xl border px-4 py-3 transition-colors",
                done && "border-[#E7E7E7] bg-[#FAFAFA]/40",
                active && "border-[#111111]/30 bg-[#FAFAFA]",
                pending && "border-slate-100 bg-slate-50/30 opacity-70",
                error && index === activeIndex && "border-red-200 bg-red-50/50",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {done ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : active ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E7E7E7] bg-[#FAFAFA]" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-[#111111] animate-pulse" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-[10px] font-bold text-slate-400">
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#111111]">{step.label}</div>
                {step.description && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{step.description}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {error && (
        <p className="text-sm font-semibold text-red-700 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          {error}
        </p>
      )}

      {logs.length > 0 && (
        <div
          className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left font-mono text-xs text-slate-600 max-h-32 immimate-scroll space-y-1"
          aria-label="Operation log"
        >
          {logs.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`}>
              <span className="text-[#111111] font-bold mr-2">&gt;</span>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
