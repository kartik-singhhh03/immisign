"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pageHeaderTypography } from "@/components/layout/PageHeader"
import type { ClientMatterContext } from "../lib/client-matter-context"
import type { ClientFileSource } from "@/features/file-notes/services/client-files.service"

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-[#111111] mb-3">{value?.trim() || "Not Provided"}</dd>
    </>
  )
}

function complianceColor(status: "complete" | "action" | "blocked") {
  if (status === "complete") return "text-[#111111]"
  if (status === "blocked") return "text-rose-700"
  return "text-amber-700"
}

type Props = {
  clientId: string
  workspaceSlug: string
  loading?: boolean
  context: ClientMatterContext | null
  onRefresh?: () => void
}

export function ClientMatterDetailsPanel({ clientId, workspaceSlug, loading, context }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [switcherOpen, setSwitcherOpen] = React.useState(false)

  const selectMatter = (source: ClientFileSource, id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("file_source", source)
    params.set("file_id", id)
    router.replace(`/workspace/${workspaceSlug}/clients/${clientId}?${params.toString()}`, { scroll: false })
    setSwitcherOpen(false)
  }

  if (loading) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center text-sm text-slate-400 animate-pulse">
          Loading matter details…
        </CardContent>
      </Card>
    )
  }

  if (!context) return null

  const { selectedMatter, matters, nextAction, compliance, workflowTimeline } = context

  return (
    <div className="space-y-5">
      {/* Matter switcher */}
      {matters.length > 1 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#111111] shadow-sm hover:border-[#111111]/40"
          >
            {selectedMatter?.file_number || "Select matter"}
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", switcherOpen && "rotate-180")} />
          </button>
          {switcherOpen && (
            <div className="absolute z-20 mt-2 min-w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl py-1">
              {matters.map((m) => (
                <button
                  key={`${m.source}-${m.id}`}
                  type="button"
                  onClick={() => selectMatter(m.source, m.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50",
                    selectedMatter?.id === m.id && selectedMatter?.source === m.source && "bg-[#FAFAFA]/60 font-bold",
                  )}
                >
                  <div className="font-semibold text-[#111111]">{m.file_number}</div>
                  {m.short_label && <div className="text-xs text-slate-500 mt-0.5">{m.short_label}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matter Details Card */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 py-5 border-b border-slate-100 bg-[#fafbfc]">
            <h2 className="text-lg font-bold text-[#111111]">Matter Details</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Operational summary — visa, stage, ownership, and compliance at a glance.
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <dl className="space-y-4">
              <DetailField label="Matter Type" value={context.matterType} />
              <DetailField label="Visa Subclass" value={context.visaSubclass} />
              <DetailField label="Visa Stream" value={context.visaStream} />
              <DetailField label="Assigned Agent" value={context.assignedAgent?.name} />
            </dl>
            <dl className="space-y-4">
              <DetailField label="Current Stage" value={context.currentStage} />
              <DetailField label="Matter Status" value={context.matterStatus} />
              <DetailField
                label="Priority"
                value={context.priority ? context.priority.charAt(0).toUpperCase() + context.priority.slice(1) : null}
              />
            </dl>
          </div>

          {/* Compliance */}
          <div className="mx-6 mb-6 rounded-xl border border-slate-200 bg-[#fafbfc] p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Compliance Status</p>
                <p className="text-lg font-black text-[#111111] mt-1">
                  {compliance.completed} / {compliance.total} Complete
                </p>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-black",
                  compliance.scorePercent >= 75 && "bg-[#FAFAFA] text-[#111111]",
                  compliance.scorePercent >= 50 && compliance.scorePercent < 75 && "bg-amber-50 text-amber-700",
                  compliance.scorePercent < 50 && "bg-rose-50 text-rose-700",
                )}
              >
                {compliance.scorePercent}% Compliant
              </div>
            </div>
            <ul className="space-y-2">
              {compliance.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm font-semibold">
                  {item.status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#5C5C5C] shrink-0" />
                  ) : item.status === "blocked" ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className={complianceColor(item.status)}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Timeline */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-[#111111] mb-4">Workflow Progress</h3>
          <div className="flex flex-wrap gap-2">
            {workflowTimeline.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold",
                  stage.complete && "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]",
                  stage.current && !stage.complete && "border-[#111111]/30 bg-[#FAFAFA] text-[#111111]",
                  !stage.complete && !stage.current && "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                {stage.complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : stage.current ? (
                  <Clock className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {stage.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Action */}
      <Card
        className={cn(
          "rounded-2xl border shadow-sm overflow-hidden",
          nextAction.tone === "success" && "border-[#E7E7E7] bg-[#FAFAFA]/40",
          nextAction.tone === "warning" && "border-amber-200 bg-amber-50/40",
          nextAction.tone === "primary" && "border-[#111111]/20 bg-[#FAFAFA]/30",
          nextAction.tone === "muted" && "border-slate-200 bg-white",
        )}
      >
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">What happens next?</p>
            <p className="text-base font-black text-[#111111] mt-1">{nextAction.label}</p>
            <p className="text-sm text-slate-600 mt-1 font-medium">{nextAction.description}</p>
          </div>
          {nextAction.href && (
            <Button
              asChild
              className={cn(
                "rounded-xl font-bold shrink-0 h-11",
                nextAction.tone === "warning" && "bg-amber-600 hover:bg-amber-700",
                nextAction.tone !== "warning" && "bg-[#111111] hover:bg-[#222222]",
              )}
            >
              <Link href={nextAction.href}>
                {nextAction.label}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ClientProfileHeader({
  clientName,
  context,
}: {
  clientName: string
  context: ClientMatterContext | null
}) {
  if (!context) {
    return (
      <div>
        <p className={pageHeaderTypography.eyebrow}>Client Profile</p>
        <h1 className={pageHeaderTypography.title}>{clientName}</h1>
      </div>
    )
  }

  const subclassLine = [context.visaSubclass, context.visaStream].filter(Boolean).join(" · ")

  return (
    <div className="space-y-4">
      <p className={pageHeaderTypography.eyebrow}>Client Profile</p>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className={pageHeaderTypography.title}>{clientName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            {context.fileNumber && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-[#111111]">
                {context.fileNumber}
              </span>
            )}
            {context.clientNumber && context.clientNumber !== context.fileNumber && (
              <span className="text-slate-400">Client #{context.clientNumber}</span>
            )}
          </div>
          {subclassLine && (
            <p className="mt-2 text-sm font-bold text-slate-600">
              {context.visaSubclass ? `Subclass ${subclassLine}` : subclassLine}
            </p>
          )}
          {context.matterType && (
            <p className="text-xs font-semibold text-slate-500 mt-1">{context.matterType}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="inline-flex items-center rounded-xl border border-[#111111]/25 bg-[#FAFAFA] px-3 py-1.5 text-xs font-bold text-[#111111]">
            {context.currentStage}
          </span>
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            <User className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            {context.assignedAgent?.name || "Unassigned"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-black",
              context.compliance.scorePercent >= 75 && "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]",
              context.compliance.scorePercent >= 50 && context.compliance.scorePercent < 75 && "border-amber-200 bg-amber-50 text-amber-700",
              context.compliance.scorePercent < 50 && "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            {context.compliance.scorePercent}% Compliant
          </span>
        </div>
      </div>
    </div>
  )
}
