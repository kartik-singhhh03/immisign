"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getRealAgencyId } from "@/lib/hooks/useSupabaseData"
import { PageEmptyState } from "@/components/ui/standards"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, FileCheck2, FileText } from "lucide-react"
import { FileNotesPanel } from "@/features/file-notes/components/FileNotesPanel"
import { ApplicationPreparationPanel } from "@/features/approvals/components/client/ApplicationPreparationPanel"
import { ServiceStatementPanel } from "@/features/service-statements/components/ServiceStatementPanel"
import { resolveMatterScopeFromFile } from "../lib/matter-scope"
import type { ClientMatterContext } from "../lib/client-matter-context"
import type { ClientFile, ClientFileSource } from "@/features/file-notes/services/client-files.service"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "service_agreement", label: "Service Agreement" },
  { id: "file_notes", label: "File Notes" },
  { id: "preparation", label: "Application Preparation" },
  { id: "approval", label: "Application Approval" },
  { id: "lodgement", label: "Lodgement" },
  { id: "statement_of_service", label: "Statement of Service" },
  { id: "completion", label: "Completion" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function ClientDetailWorkspace({
  clientId,
  agencyWorkspaceId,
  workspaceSlug,
  client,
  matterContext,
  canEditNotes = true,
  canManage = true,
}: {
  clientId: string
  agencyWorkspaceId: string
  workspaceSlug: string
  client: { id: string; name: string; email: string; phone?: string | null; client_number?: string | null; created_at?: string }
  matterContext?: ClientMatterContext | null
  canEditNotes?: boolean
  canManage?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab") as TabId | null
  const urlFileSource = searchParams.get("file_source") as ClientFileSource | null
  const urlFileId = searchParams.get("file_id")
  const [tab, setTab] = React.useState<TabId>(
    tabFromUrl && TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : "overview",
  )

  React.useEffect(() => {
    if (tabFromUrl && TABS.some((t) => t.id === tabFromUrl)) {
      setTab(tabFromUrl)
    }
  }, [tabFromUrl])
  const [loading, setLoading] = React.useState(false)
  const [agreements, setAgreements] = React.useState<any[]>([])
  const [approvals, setApprovals] = React.useState<any[]>([])
  const [serviceStatements, setServiceStatements] = React.useState<any[]>([])

  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const agencyId = await getRealAgencyId(supabase, agencyWorkspaceId)
        if (!agencyId || cancelled) return

        const [agRes, apRes, sosRes] = await Promise.all([
          supabase
            .from("agreements")
            .select("id, agreement_number, title, status, signwell_document_id, created_at, completed_at, sent_at")
            .eq("agency_id", agencyId)
            .eq("client_id", clientId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("application_approvals")
            .select("id, approval_number, title, status, created_at, lodged_at, ready_to_lodge_at, client_signed_at")
            .eq("agency_id", agencyId)
            .eq("client_id", clientId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("service_statements")
            .select("id, agreement_id, approval_id, statement_number, status, acknowledged_at, issued_at, created_at")
            .eq("agency_id", agencyId)
            .eq("client_id", clientId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(20),
        ])

        if (!cancelled) {
          setAgreements(agRes.data || [])
          setApprovals(apRes.data || [])
          setServiceStatements(sosRes.data || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agencyWorkspaceId, clientId, supabase])

  const prefix = `/workspace/${workspaceSlug}`
  const saWizardHref = `${prefix}/agreements/new?clientId=${clientId}`

  const selectedFileId = matterContext?.selectedMatter?.id ?? urlFileId ?? undefined
  const selectedFileSource = (matterContext?.selectedMatter?.source ??
    urlFileSource ??
    undefined) as ClientFileSource | undefined

  const matterInUrl = Boolean(urlFileSource && urlFileId)

  const urlMatterFile: ClientFile | null = React.useMemo(() => {
    if (!urlFileSource || !urlFileId) return null
    if (urlFileSource === "agreement") {
      const row = agreements.find((a) => a.id === urlFileId)
      if (!row) return null
      return {
        id: urlFileId,
        source: "agreement",
        file_number: row.agreement_number || "",
        visa_subclass: null,
        matter_label: null,
        display_label: row.agreement_number || row.title || "",
        short_label: "",
        status: row.status || "draft",
        is_active: true,
        created_at: row.created_at || "",
      }
    }
    const row = approvals.find((a) => a.id === urlFileId)
    if (!row) return null
    return {
      id: urlFileId,
      source: "application_approval",
      file_number: row.approval_number || "",
      visa_subclass: null,
      matter_label: null,
      display_label: row.approval_number || row.title || "",
      short_label: "",
      status: row.status || "draft",
      is_active: true,
      created_at: row.created_at || "",
    }
  }, [urlFileSource, urlFileId, agreements, approvals])

  const effectiveMatterFile = matterContext?.selectedMatter ?? urlMatterFile

  const matterScope = effectiveMatterFile
    ? resolveMatterScopeFromFile(
        effectiveMatterFile,
        agreements,
        approvals,
        serviceStatements,
      )
    : null

  const scopedAgreements = matterScope?.agreements ?? (matterInUrl ? [] : agreements)
  const scopedApprovals = matterScope?.approvals ?? (matterInUrl ? [] : approvals)
  const scopedServiceStatements = matterScope?.statements ?? (matterInUrl ? [] : serviceStatements)

  const signals = matterScope?.signals ?? {
    hasSignedServiceAgreement: false,
    hasClientSignedApproval: false,
    hasLodgedApplication: false,
    hasAcknowledgedStatementOfService: false,
  }
  const gates =
    matterContext?.compliance?.items?.map((item) => ({
      id: item.id,
      label: item.label,
      met: item.status === 'complete',
    })) ??
    matterScope?.gates ??
    []
  const complete = matterContext?.isComplete ?? matterScope?.isComplete ?? false

  const draftApprovals = scopedApprovals.filter((a) => a.status === "draft")
  const lodgedApprovals = scopedApprovals.filter(
    (a) => a.status === "lodged" || a.lodged_at,
  )
  const activeApprovals = scopedApprovals.filter((a) => a.status !== "draft")

  const matterSelected = Boolean(matterScope || (urlFileSource && urlFileId))
  const overviewAgreementCount = matterSelected ? scopedAgreements.length : agreements.length
  const overviewApprovalCount = matterSelected ? scopedApprovals.length : approvals.length
  const overviewSosCount = matterSelected ? scopedServiceStatements.length : serviceStatements.length

  const matterQuery =
    selectedFileSource && selectedFileId
      ? `&file_source=${selectedFileSource}&file_id=${selectedFileId}`
      : ""

  const selectTab = (id: TabId) => {
    setTab(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", id)
    router.replace(
      `/workspace/${workspaceSlug}/clients/${clientId}?${params.toString()}`,
      { scroll: false },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              tab === t.id
                ? "bg-[#111111] text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border border-slate-200/50 bg-white shadow-sm">
        <CardContent className="p-6">
          {loading && tab !== "overview" && tab !== "file_notes" && (
            <div className="py-12 text-center text-sm text-slate-400 font-semibold animate-pulse">
              Loading…
            </div>
          )}

          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Service Agreements"
                  value={String(overviewAgreementCount)}
                  met={signals.hasSignedServiceAgreement}
                />
                <Stat
                  label="Approvals"
                  value={String(overviewApprovalCount)}
                  met={signals.hasLodgedApplication}
                />
                <Stat
                  label="Statements of Service"
                  value={String(overviewSosCount)}
                  met={signals.hasAcknowledgedStatementOfService}
                />
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Workflow status (computed)
                </div>
                <ul className="space-y-2">
                  {gates.map((gate) => (
                    <li key={gate.id} className="flex items-center gap-2 text-sm font-semibold">
                      {gate.met ? (
                        <CheckCircle2 className="h-4 w-4 text-[#5C5C5C] shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                      <span className={gate.met ? "text-[#111111]" : "text-slate-500"}>
                        {gate.label}
                      </span>
                    </li>
                  ))}
                </ul>
                {complete && (
                  <div className="mt-4 rounded-lg bg-[#FAFAFA] border border-[#E7E7E7] px-3 py-2 text-xs font-bold text-[#111111]">
                    Matter complete — all workflow gates satisfied for this file.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" className="rounded-xl bg-[#111111] font-bold">
                  <Link href={saWizardHref}>New Service Agreement</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link href={`${prefix}/approvals/new?clientId=${clientId}${matterQuery}`}>
                    New Application Approval
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link href={`${prefix}/service-statements/new?clientId=${clientId}${matterQuery}`}>
                    New Statement of Service
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {tab === "service_agreement" && !loading && (
            scopedAgreements.length ? (
              <ul className="space-y-2">
                {scopedAgreements.map((a) => (
                  <li key={a.id} className="flex justify-between items-center rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#111111]">{a.title || a.agreement_number}</div>
                      <div className="text-xs text-slate-400 font-semibold">{a.status}</div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold">
                      <Link href={`${prefix}/agreements/${a.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState module="agreements" actionHref={saWizardHref} />
            )
          )}

          {tab === "file_notes" && (
            <FileNotesPanel
              clientId={clientId}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              clientNumber={client.client_number}
              initialFileSource={selectedFileSource}
              initialFileId={selectedFileId}
              canAdd={canEditNotes}
            />
          )}

          {tab === "preparation" && (
            <ApplicationPreparationPanel
              clientId={clientId}
              workspaceSlug={workspaceSlug}
              draftApprovals={draftApprovals}
              loading={loading}
            />
          )}

          {tab === "approval" && !loading && (
            activeApprovals.length ? (
              <ul className="space-y-2">
                {activeApprovals.map((a) => (
                  <li key={a.id} className="flex justify-between items-center rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#111111]">{a.approval_number || a.title}</div>
                      <div className="text-xs text-slate-400 font-semibold">{a.status}</div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold">
                      <Link href={`${prefix}/approvals/${a.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                module="approvals"
                actionHref={`${prefix}/approvals/new?clientId=${clientId}`}
              />
            )
          )}

          {tab === "lodgement" && !loading && (
            lodgedApprovals.length ? (
              <ul className="space-y-2">
                {lodgedApprovals.map((a) => (
                  <li key={a.id} className="rounded-xl border border-[#E7E7E7] bg-[#FAFAFA]/30 px-4 py-3">
                    <div className="text-sm font-bold text-[#111111]">{a.approval_number || a.title}</div>
                    <div className="text-xs text-[#111111] font-semibold mt-0.5">
                      Lodged
                      {a.lodged_at
                        ? ` · ${new Date(a.lodged_at).toLocaleString("en-AU")}`
                        : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FileCheck2 className="h-8 w-8 text-slate-400" />}
                title="Not lodged yet"
                description="Mark an approved application as lodged from the Application Approval workspace."
                className="min-h-[200px] border-slate-200/60 bg-white/50"
              />
            )
          )}

          {tab === "statement_of_service" && (
            <ServiceStatementPanel
              clientId={clientId}
              workspaceSlug={workspaceSlug}
              canManage={canManage}
              agreementId={matterScope?.unit.agreementId}
              approvalId={matterScope?.unit.approvalId}
              fileSource={selectedFileSource}
              fileId={selectedFileId}
            />
          )}

          {tab === "completion" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Matter Completion Status</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {matterContext?.fileNumber
                    ? `File ${matterContext.fileNumber} — completion is computed per matter, not per client.`
                    : "Select a matter to view its completion status."}
                </p>
              </div>
              <ul className="space-y-3">
                {gates.map((gate) => (
                  <li
                    key={gate.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      gate.met ? "border-[#E7E7E7] bg-[#FAFAFA]/40" : "border-slate-100",
                    )}
                  >
                    {gate.met ? (
                      <CheckCircle2 className="h-5 w-5 text-[#5C5C5C] shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#111111]">{gate.label}</span>
                  </li>
                ))}
              </ul>
              {complete ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#111111] text-white px-4 py-3 text-sm font-bold">
                    This matter is complete.
                  </div>
                  {(matterContext?.matterCompletion?.completedAt ||
                    matterContext?.matterCompletion?.completedByName) && (
                    <dl className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      {matterContext.matterCompletion.completedAt && (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Completion Date
                          </dt>
                          <dd className="text-sm font-semibold text-[#111111] mt-0.5">
                            {new Date(matterContext.matterCompletion.completedAt).toLocaleString("en-AU")}
                          </dd>
                        </div>
                      )}
                      {matterContext.matterCompletion.completedByName && (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Completed By
                          </dt>
                          <dd className="text-sm font-semibold text-[#111111] mt-0.5">
                            {matterContext.matterCompletion.completedByName}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-semibold">
                  Complete remaining workflow steps to close this matter.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  met,
}: {
  label: string
  value: string
  met?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        {met !== undefined && (
          met ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[#5C5C5C]" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-slate-300" />
          )
        )}
      </div>
      <div className="text-2xl font-black text-[#111111] mt-1">{value}</div>
    </div>
  )
}
