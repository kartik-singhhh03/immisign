"use client"

import { cn } from "@/lib/utils"
import { WIZARD_STEPS } from "../../constants/wizard-options"

type Props = {
  currentStep: number
  hidden?: boolean
}

export function WizardStepper({ currentStep, hidden }: Props) {
  if (hidden) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex w-full">
        {WIZARD_STEPS.map((step, idx) => {
          const isComplete = currentStep > idx
          const isActive = currentStep === idx
          return (
            <div
              key={step}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wide border-r border-slate-100 last:border-r-0 transition-colors",
                isComplete && "bg-[#d1fae5]/60 text-[#0D9F8C]",
                isActive && "bg-[#0D9F8C] text-white",
                !isComplete && !isActive && "bg-white text-slate-400"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                isComplete && "bg-[#0D9F8C] text-white",
                isActive && "bg-white/20 text-white",
                !isComplete && !isActive && "bg-slate-100 text-slate-400"
              )}>
                {isComplete ? "✓" : idx + 1}
              </span>
              <span className="hidden sm:inline truncate">{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
