"use client"

import * as React from "react"
import {
  Check,
  CloudUpload,
  FileText,
  FileUser,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const WORKFLOW_STEPS: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Client", desc: "Create and manage client matter", icon: User },
  { title: "Service Agreement", desc: "Send, sign and store agreements", icon: FileText },
  { title: "File Notes", desc: "Capture every interaction", icon: FileText },
  { title: "Application Preparation", desc: "Prepare and collect documents", icon: FileUser },
  { title: "Application Approval", desc: "Client reviews and approves", icon: ShieldCheck },
  { title: "Lodgement", desc: "Lodge with confidence", icon: CloudUpload },
  { title: "Statement of Service", desc: "Document work performed", icon: FileText },
  { title: "Completion", desc: "Matter complete and audit-ready", icon: Check },
]

export function WorkflowTimeline() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  return (
    <>
      <div className="mt-16 hidden lg:block">
        <div className="relative px-2">
          <div
            className="absolute left-[6%] right-[6%] top-[1.65rem] border-t border-dashed border-[#C8C8C8]"
            aria-hidden
          />
          <div className="grid grid-cols-8 gap-1">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = activeIndex === index
              const Icon = step.icon
              return (
                <button
                  key={step.title}
                  type="button"
                  className="group relative flex flex-col items-center px-1 text-center focus:outline-none"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div
                    className={cn(
                      "relative z-10 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-mate-primary shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-300",
                      "group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
                      isActive && "-translate-y-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
                    )}
                  >
                    <Icon className="h-[1.35rem] w-[1.35rem] text-white" strokeWidth={1.5} />
                  </div>
                  <span className="mt-3 text-[11px] font-semibold text-mate-accent">
                    {index + 1}
                  </span>
                  <h3 className="mt-2 text-[13px] font-semibold leading-tight text-mate-primary">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[9.5rem] text-[11px] leading-[1.5] text-mate-muted">
                    {step.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:hidden">
        {WORKFLOW_STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              className="flex gap-4 rounded-xl border border-mate-border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mate-primary">
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold text-mate-accent">{i + 1}</span>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-mate-primary">{step.title}</h3>
                <p className="mt-1 text-xs text-mate-muted">{step.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
