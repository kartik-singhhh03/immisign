"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSignature,
  FileText,
  Plus,
  Search,
  StickyNote,
  UserPlus,
  X,
} from "lucide-react"
import type {
  AttentionQueueRow,
  ComplianceActivityItem,
  ComplianceDashboardPayload,
  ComplianceFilterKey,
  ComplianceTrend,
} from "../types"
import { PageHeader } from "@/components/ui/page-header"
import { ImmiMateTable } from "@/components/ui/immimate-table"
import { ProfessionalEmptyState } from "@/components/ui/professional-empty-state"
import { DashboardSkeleton } from "@/components/ui/skeletons"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileSignature,
  FileCheck2,
  ClipboardCheck,
  FileText,
  StickyNote,
  Award,
  CheckCircle2,
  Activity,
}

const COMPLIANCE_FILTER_LABELS: Record<ComplianceFilterKey, string> = {
  missing_sa: "Missing Service Agreements",
  pending_approval: "Pending Approvals",
  awaiting_lodge: "Awaiting Lodgement",
  missing_sos: "Missing SOS",
  incomplete_matters: "Incomplete Matters",
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  })
}

function formatExact(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function trendClass(trend: ComplianceTrend): string {
  if (trend === "up") return "text-[#232323]"
  if (trend === "down") return "text-[#6E6E6E]"
  return "text-[#6E6E6E]"
}

function matterDeepLink(slug: string, row: AttentionQueueRow): string {
  const tab = resolveTabFromStage(row.currentStage)
  const params = new URLSearchParams({
    file_source: row.fileSource,
    file_id: row.fileId,
  })
  if (tab) params.set("tab", tab)
  return `/workspace/${slug}/clients/${row.clientId}?${params.toString()}`
}

function resolveTabFromStage(stage: string): string | null {
  const s = stage.toLowerCase()
  if (s.includes("lodgement") || s === "lodged") return "lodgement"
  if (s.includes("preparation")) return "preparation"
  if (s.includes("approval")) return "approval"
  if (s.includes("service agreement") || s.includes("missing service")) return "service_agreement"
  if (s.includes("sos") || s.includes("statement")) return "statement_of_service"
  if (s === "completed") return "completion"
  return "overview"
}

function complianceStatus(row: AttentionQueueRow): string {
  if (row.complianceScore >= 100) return "Complete"
  if (row.urgency === "overdue" || row.urgency === "attention") return "At risk"
  return "In progress"
}

function matterRowKey(row: { clientId: string; fileSource: string; fileId: string }): string {
  return `${row.clientId}:${row.fileSource}:${row.fileId}`
}

function SummaryCard({
  card,
  active,
  onSelect,
}: {
  card: ComplianceDashboardPayload["summary"][0]
  active: boolean
  onSelect: (id: ComplianceFilterKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card.id)}
      className={cn(
        "group block w-full rounded-lg border bg-white p-5 text-left transition-colors",
        active ? "border-[#232323] ring-1 ring-[#232323]/20" : "border-[#E7E7E7] hover:border-[#232323]/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
          {card.label}
        </p>
        <ArrowRight className="h-4 w-4 text-[#6E6E6E] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-[#111111]">
        {card.count}
      </p>
      <p className="mt-1 text-xs text-[#6E6E6E]">matters</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E6E6E]">
        <span className={cn("font-medium", trendClass(card.trend))}>
          {card.trendLabel}
        </span>
        <span>Updated {formatExact(card.lastUpdated)}</span>
      </div>
    </button>
  )
}

function ActivityRow({ item, workspaceSlug }: { item: ComplianceActivityItem; workspaceSlug: string }) {
  const Icon = ICONS[item.icon] || Activity
  const href = item.clientId
    ? `/workspace/${workspaceSlug}/clients/${item.clientId}`
    : `/workspace/${workspaceSlug}/activity`

  return (
    <Link
      href={href}
      className="flex gap-4 border-b border-[#E7E7E7] py-4 last:border-0 hover:bg-[#FAFAFA] px-2 -mx-2 rounded-md transition-colors"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E7E7E7] bg-[#FAFAFA] text-[#232323]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#111111]">{item.action}</p>
        <p className="text-xs text-[#6E6E6E] mt-0.5">
          {item.agentName} · {item.clientName}
        </p>
        <p className="text-[11px] text-[#6E6E6E] mt-1">{formatRelative(item.timestamp)}</p>
      </div>
    </Link>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[#E7E7E7] bg-white px-2 py-1.5 text-xs font-medium normal-case text-[#232323]"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ComplianceDashboardPage() {
  const searchParams = useSearchParams()
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const user = useAuthStore((s) => s.user)
  const slug = activeWorkspace?.slug || "workspace"
  const [data, setData] = React.useState<ComplianceDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [extras, setExtras] = React.useState<{
    pendingSignatures: { id: string; title?: string; status?: string; clients?: { name?: string } }[]
    practiceRevenue: { total: number; currency: string; hasData: boolean }
  } | null>(null)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [cardFilter, setCardFilter] = React.useState<ComplianceFilterKey | null>(
    (searchParams.get("compliance") as ComplianceFilterKey | null) || null,
  )
  const [matterTypeFilter, setMatterTypeFilter] = React.useState("")
  const [visaFilter, setVisaFilter] = React.useState("")
  const [agentFilter, setAgentFilter] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("")
  const [priorityFilter, setPriorityFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")
  const queueRef = React.useRef<HTMLDivElement>(null)

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/compliance/dashboard")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard")
      setData(json.dashboard)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.summary) {
          setExtras({
            pendingSignatures: json.summary.pendingSignatures || [],
            practiceRevenue: json.summary.practiceRevenue || { total: 0, currency: "AUD", hasData: false },
          })
        }
      })
      .catch(() => {})
  }, [load])

  const cardMatterKeys = React.useMemo(() => {
    if (!data || !cardFilter) return null
    const card = data.summary.find((c) => c.id === cardFilter)
    if (!card?.matters?.length) return null
    return new Set(card.matters.map((m) => matterRowKey(m)))
  }, [data, cardFilter])

  const filteredRows = React.useMemo(() => {
    if (!data) return []
    const q = searchQuery.trim().toLowerCase()
    return data.attentionQueue.filter((row) => {
      if (cardMatterKeys && !cardMatterKeys.has(matterRowKey(row))) return false
      if (matterTypeFilter && row.matterType !== matterTypeFilter) return false
      if (visaFilter && row.visaSubclass !== visaFilter) return false
      if (agentFilter && row.assignedAgent !== agentFilter) return false
      if (stageFilter && row.currentStage !== stageFilter) return false
      if (priorityFilter && row.priority !== priorityFilter) return false
      if (statusFilter && complianceStatus(row) !== statusFilter) return false
      if (!q) return true
      const hay = [
        row.clientName,
        row.fileNumber,
        row.visaSubclass,
        row.matterType,
        row.assignedAgent,
        row.currentStage,
        row.nextAction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [
    data,
    searchQuery,
    cardMatterKeys,
    matterTypeFilter,
    visaFilter,
    agentFilter,
    stageFilter,
    priorityFilter,
    statusFilter,
  ])

  const hasActiveFilters =
    Boolean(cardFilter) ||
    Boolean(matterTypeFilter) ||
    Boolean(visaFilter) ||
    Boolean(agentFilter) ||
    Boolean(stageFilter) ||
    Boolean(priorityFilter) ||
    Boolean(statusFilter) ||
    Boolean(searchQuery)

  const clearFilters = () => {
    setCardFilter(null)
    setMatterTypeFilter("")
    setVisaFilter("")
    setAgentFilter("")
    setStageFilter("")
    setPriorityFilter("")
    setStatusFilter("")
    setSearchQuery("")
  }

  const quickActions = [
    { label: "Create Client", href: `/workspace/${slug}/clients`, icon: UserPlus },
    {
      label: "Create Service Agreement",
      href: `/workspace/${slug}/agreements/new`,
      icon: FileSignature,
    },
    { label: "Add File Note", href: `/workspace/${slug}/file-notes`, icon: StickyNote },
    {
      label: "Start Application Preparation",
      href: `/workspace/${slug}/approvals/new`,
      icon: ClipboardCheck,
    },
    {
      label: "Create SOS",
      href: `/workspace/${slug}/service-statements/new`,
      icon: FileText,
    },
  ]

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-[#E7E7E7] bg-white p-8 text-center">
        <p className="text-sm font-medium text-[#111111]">{error || "Unable to load dashboard"}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 text-sm font-semibold text-[#232323] underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const queueColumns = [
    {
      key: "client",
      header: "Client",
      render: (row: AttentionQueueRow) => (
        <Link
          href={matterDeepLink(slug, row)}
          className="font-semibold text-[#111111] hover:underline focus-visible:ring-2 focus-visible:ring-[#111111]/20 rounded"
        >
          {row.clientName}
        </Link>
      ),
    },
    { key: "matterType", header: "Matter", className: "text-[#5C5C5C]" },
    {
      key: "fileNumber",
      header: "File",
      className: "font-mono text-xs text-[#232323]",
    },
    {
      key: "visaSubclass",
      header: "Visa",
      className: "text-[#5C5C5C]",
      render: (row: AttentionQueueRow) => (row.visaSubclass ? `SC${row.visaSubclass}` : "—"),
    },
    { key: "currentStage", header: "Stage", className: "text-[#232323]" },
    { key: "nextAction", header: "Next action", className: "text-[#5C5C5C]" },
    {
      key: "complianceScore",
      header: "Score",
      render: (row: AttentionQueueRow) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            row.complianceScore >= 75
              ? "text-[#111111]"
              : row.complianceScore >= 50
                ? "text-[#5C5C5C]"
                : "text-[#1C1C1C]",
          )}
        >
          {row.complianceScore}%
        </span>
      ),
    },
    {
      key: "assignedAgent",
      header: "Agent",
      className: "text-[#5C5C5C]",
      render: (row: AttentionQueueRow) => row.assignedAgent || "—",
    },
  ]

  return (
    <div className="pb-8 space-y-6 animate-enter">
      <PageHeader
        eyebrow="Compliance Dashboard"
        title="Matter attention across your practice"
        description={`Each row is one matter — not one client. ${data.attentionQueue.length} active matter${data.attentionQueue.length === 1 ? "" : "s"} for ${user?.name?.split(" ")[0] || "your team"}. Updated ${formatExact(data.generatedAt)}.`}
      />

      <section>
        <h2 className="text-sm font-semibold text-[#111111] mb-4">Compliance Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.summary.map((card) => (
            <SummaryCard
              key={card.id}
              card={card}
              active={cardFilter === card.id}
              onSelect={(id) => {
                const next = cardFilter === id ? null : id
                setCardFilter(next)
                if (next) {
                  requestAnimationFrame(() => {
                    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                  })
                }
              }}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[#E7E7E7] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#111111]">Pending Signatures</h2>
          <p className="mt-2 text-3xl font-semibold text-[#111111] tabular-nums">
            {extras?.pendingSignatures?.length ?? 0}
          </p>
          {extras?.pendingSignatures?.length ? (
            <ul className="mt-3 space-y-1 text-xs text-[#5C5C5C]">
              {extras.pendingSignatures.slice(0, 3).map((a) => (
                <li key={a.id}>
                  {(a as { clients?: { name?: string } }).clients?.name || a.title || a.id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[#6E6E6E]">No agreements awaiting signature.</p>
          )}
        </div>
        <div className="rounded-lg border border-[#E7E7E7] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#111111]">Practice Revenue</h2>
          {extras?.practiceRevenue?.hasData ? (
            <p className="mt-2 text-3xl font-semibold text-[#111111] tabular-nums">
              {new Intl.NumberFormat("en-AU", {
                style: "currency",
                currency: extras.practiceRevenue.currency || "AUD",
                maximumFractionDigits: 0,
              }).format(extras.practiceRevenue.total)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[#6E6E6E]">No revenue data available</p>
          )}
          <p className="mt-1 text-xs text-[#6E6E6E]">Sum of agreement professional fees (live DB)</p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-lg border border-[#E7E7E7] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#111111]">Practice Activity</h2>
              <Link
                href={`/workspace/${slug}/activity`}
                className="text-xs font-semibold text-[#6E6E6E] hover:text-[#111111]"
              >
                View all
              </Link>
            </div>
            {data.activity.length === 0 ? (
              <ProfessionalEmptyState
                title="No recent activity"
                description="Compliance events will appear here as your team works on matters."
                className="min-h-[160px] border-0 shadow-none py-6"
              />
            ) : (
              <div>
                {data.activity.map((item) => (
                  <ActivityRow key={item.id} item={item} workspaceSlug={slug} />
                ))}
              </div>
            )}
          </section>

          <section ref={queueRef} className="rounded-lg border border-[#E7E7E7] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E7E7] space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#111111]">Matter Attention Queue</h2>
                  <p className="text-xs text-[#6E6E6E] mt-1">
                    {filteredRows.length} matter{filteredRows.length === 1 ? "" : "s"}
                    {cardFilter ? ` · ${COMPLIANCE_FILTER_LABELS[cardFilter]}` : ""}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E6E6E] hover:text-[#111111]"
                  >
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E6E]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search client, file number, visa, matter type, agent…"
                  className="w-full rounded-md border border-[#E7E7E7] bg-[#FAFAFA] py-2 pl-9 pr-3 text-sm text-[#232323] placeholder:text-[#6E6E6E]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <FilterSelect
                  label="Matter type"
                  value={matterTypeFilter}
                  options={data.filterOptions.matterTypes}
                  onChange={setMatterTypeFilter}
                />
                <FilterSelect
                  label="Visa subclass"
                  value={visaFilter}
                  options={data.filterOptions.visaSubclasses}
                  onChange={setVisaFilter}
                />
                <FilterSelect
                  label="Agent"
                  value={agentFilter}
                  options={data.filterOptions.agents}
                  onChange={setAgentFilter}
                />
                <FilterSelect
                  label="Stage"
                  value={stageFilter}
                  options={data.filterOptions.stages}
                  onChange={setStageFilter}
                />
                <FilterSelect
                  label="Priority"
                  value={priorityFilter}
                  options={data.filterOptions.priorities}
                  onChange={setPriorityFilter}
                />
                <FilterSelect
                  label="Compliance"
                  value={statusFilter}
                  options={data.filterOptions.complianceStatuses}
                  onChange={setStatusFilter}
                />
              </div>
            </div>

            <ImmiMateTable
              columns={queueColumns}
              data={filteredRows}
              rowKey={(row) => `${row.clientId}:${row.fileSource}:${row.fileId}`}
              emptyTitle="No matters match"
              emptyDescription="Adjust your filters or create a new client and matter to get started."
              emptyAction={
                <Link
                  href={`/workspace/${slug}/onboarding/new`}
                  className="inline-flex items-center rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B1B1B] focus-visible:ring-2 focus-visible:ring-[#111111]/20"
                >
                  New Client & Matter
                </Link>
              }
              className="border-0 shadow-none rounded-none"
            />
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-lg border border-[#E7E7E7] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#111111] mb-4">Workflow Health</h2>
            <div className="space-y-0">
              {data.workflowFunnel.map((stage, index) => (
                <div key={stage.id}>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-[#232323]">{stage.label}</span>
                    <span className="text-sm font-semibold text-[#111111] tabular-nums">
                      {stage.count} <span className="font-normal text-[#6E6E6E]">matters</span>
                    </span>
                  </div>
                  {index < data.workflowFunnel.length - 1 && (
                    <div className="flex justify-center py-0.5 text-[#6E6E6E]">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#E7E7E7] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#111111]">Matter Readiness</h2>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-[#111111] tabular-nums">
              {data.auditReadiness.percentage}%
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[#6E6E6E]">
              {data.auditReadiness.explanation}
            </p>
            <ul className="mt-5 space-y-2 border-t border-[#E7E7E7] pt-4">
              {(
                [
                  ["SA signed", data.auditReadiness.breakdown.saSigned],
                  ["Approval signed", data.auditReadiness.breakdown.approvalSigned],
                  ["Lodged", data.auditReadiness.breakdown.lodged],
                  ["SOS acknowledged", data.auditReadiness.breakdown.sosAcknowledged],
                ] as const
              ).map(([label, stat]) => (
                <li key={label} className="flex justify-between text-xs">
                  <span className="text-[#6E6E6E]">{label}</span>
                  <span className="font-semibold text-[#111111] tabular-nums">
                    {stat.count}/{stat.total} ({stat.percent}%)
                  </span>
                </li>
              ))}
            </ul>
            {data.auditReadiness.missingRequirements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E7E7E7]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E6E] mb-2">
                  Missing requirements
                </p>
                <ul className="space-y-1">
                  {data.auditReadiness.missingRequirements.map((m) => (
                    <li key={m.label} className="text-xs text-[#232323]">
                      {m.label}: {m.matterCount} matter{m.matterCount === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#E7E7E7] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#111111] mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-md border border-[#E7E7E7] px-4 py-3 text-sm font-medium text-[#232323] transition-colors hover:border-[#232323]/25 hover:bg-[#FAFAFA]"
                >
                  <span className="flex items-center gap-3">
                    <action.icon className="h-4 w-4 text-[#6E6E6E]" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#6E6E6E]" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
