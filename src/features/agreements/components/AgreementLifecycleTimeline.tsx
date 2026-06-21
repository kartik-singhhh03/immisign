"use client"

import { cn } from "@/lib/utils"

const LIFECYCLE_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Generated" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "signed", label: "Signed" },
] as const

const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  pending: 1,
  generated: 1,
  sent: 2,
  viewed: 3,
  signed: 4,
  completed: 5,
}

function normalizeStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === "generated") return "pending"
  return s
}

export function AgreementLifecycleTimeline({
  status,
  hasPdf,
  className,
}: {
  status: string
  hasPdf?: boolean
  className?: string
}) {
  const normalized = normalizeStatus(status)
  let currentIndex = STATUS_ORDER[normalized] ?? 0
  if (normalized === "draft" && hasPdf) {
    currentIndex = 1
  }
  if (normalized === "completed") {
    currentIndex = LIFECYCLE_STEPS.length
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {LIFECYCLE_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide border",
                done && "bg-[#111111] text-white border-[#111111]",
                active && !done && "bg-[#FAFAFA] text-[#111111] border-[#111111]",
                !done && !active && "bg-white text-slate-400 border-slate-200",
              )}
            >
              {step.label}
            </div>
            {index < LIFECYCLE_STEPS.length - 1 && (
              <span className={cn("text-slate-300 text-xs", done && "text-[#111111]")}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function canSendAgreement(status: string, hasPdf: boolean): boolean {
  const s = normalizeStatus(status)
  if (!hasPdf) return false
  if (s === "signed" || s === "completed" || s === "cancelled") return false
  return ["pending", "generated", "sent", "viewed", "declined", "expired"].includes(s)
}

export function sendAgreementButtonLabel(status: string): string {
  const s = normalizeStatus(status)
  if (s === "sent" || s === "viewed") return "Resend Signature Request"
  return "Request Signature"
}
