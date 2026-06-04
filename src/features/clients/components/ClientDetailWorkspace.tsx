"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getRealAgencyId } from "@/lib/hooks/useSupabaseData"
import { PageEmptyState } from "@/components/ui/standards"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileSignature, FileText, CheckCircle2, Clock, MessageSquare } from "lucide-react"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "agreements", label: "Agreements" },
  { id: "approvals", label: "Approvals" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function ClientDetailWorkspace({
  clientId,
  agencyWorkspaceId,
  workspaceSlug,
  client,
  timelineData,
  timelineLoading,
}: {
  clientId: string
  agencyWorkspaceId: string
  workspaceSlug: string
  client: { id: string; name: string; email: string; phone?: string | null; created_at?: string }
  timelineData?: Array<{ title: string; date: Date; type: string }>
  timelineLoading?: boolean
}) {
  const [tab, setTab] = React.useState<TabId>("overview")
  const [loading, setLoading] = React.useState(false)
  const [agreements, setAgreements] = React.useState<any[]>([])
  const [approvals, setApprovals] = React.useState<any[]>([])
  const [documents, setDocuments] = React.useState<any[]>([])
  const [activity, setActivity] = React.useState<any[]>([])
  const [notes, setNotes] = React.useState("")

  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const agencyId = await getRealAgencyId(supabase, agencyWorkspaceId)
        if (!agencyId || cancelled) return

        const agRes = await supabase
          .from("agreements")
          .select("id, agreement_number, title, status, signwell_document_id, created_at")
          .eq("agency_id", agencyId)
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(20)

        const agreementIds = (agRes.data || []).map((a) => a.id)
        const [apRes, docRes, actRes] = await Promise.all([
          supabase
            .from("application_approvals")
            .select("id, approval_number, title, status, created_at")
            .eq("agency_id", agencyId)
            .eq("client_id", clientId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(20),
          agreementIds.length
            ? supabase
                .from("documents")
                .select("id, file_name, signwell_status, signwell_document_id, created_at, agreement_id")
                .eq("agency_id", agencyId)
                .in("agreement_id", agreementIds)
                .order("created_at", { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from("activity_logs")
            .select("id, title, description, type, created_at, reference_id")
            .eq("agency_id", agencyId)
            .eq("reference_id", clientId)
            .order("created_at", { ascending: false })
            .limit(30),
        ])

        if (!cancelled) {
          setAgreements(agRes.data || [])
          setApprovals(apRes.data || [])
          setDocuments((docRes as { data: any[] }).data || [])
          setActivity(actRes.data || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agencyWorkspaceId, clientId, client.name, supabase])

  const prefix = `/workspace/${workspaceSlug}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              tab === t.id
                ? "bg-[#0D9F8C] text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border border-slate-200/50 bg-white shadow-sm">
        <CardContent className="p-6">
          {loading && tab !== "overview" && tab !== "timeline" && (
            <div className="py-12 text-center text-sm text-slate-400 font-semibold animate-pulse">
              Loading…
            </div>
          )}

          {tab === "overview" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Agreements" value={String(agreements.length)} />
              <Stat label="Approvals" value={String(approvals.length)} />
              <Stat label="Documents" value={String(documents.length)} />
              <div className="sm:col-span-3 flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" className="rounded-xl bg-[#0D9F8C] font-bold">
                  <Link href={`${prefix}/agreements/new`}>New agreement</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link href={`${prefix}/documents/send`}>Send document</Link>
                </Button>
              </div>
            </div>
          )}

          {tab === "agreements" && !loading && (
            agreements.length ? (
              <ul className="space-y-2">
                {agreements.map((a) => (
                  <li key={a.id} className="flex justify-between items-center rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#081B2E]">{a.title || a.agreement_number}</div>
                      <div className="text-xs text-slate-400 font-semibold">{a.status}</div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold">
                      <Link href={`${prefix}/agreements/${a.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                module="agreements"
                actionHref={`${prefix}/agreements/new`}
              />
            )
          )}

          {tab === "approvals" && !loading && (
            approvals.length ? (
              <ul className="space-y-2">
                {approvals.map((a) => (
                  <li key={a.id} className="flex justify-between items-center rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#081B2E]">{a.approval_number || a.title}</div>
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
                actionHref={`${prefix}/approvals/new`}
              />
            )
          )}

          {tab === "documents" && !loading && (
            documents.length ? (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id} className="rounded-xl border border-slate-100 px-4 py-3">
                    <div className="text-sm font-bold text-[#081B2E]">{d.file_name}</div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">
                      {d.signwell_document_id ? `SignWell · ${d.signwell_status || "sent"}` : "Not dispatched"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                module="documents"
                actionHref={`${prefix}/documents/send`}
              />
            )
          )}

          {tab === "timeline" && (
            timelineLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm font-semibold">Loading timeline…</div>
            ) : timelineData?.length ? (
              <ul className="space-y-3">
                {timelineData.map((event, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <Clock className="h-4 w-4 text-[#0D9F8C] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-[#081B2E]">{event.title}</div>
                      <div className="text-xs text-slate-400">{event.date.toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Clock className="h-8 w-8 text-slate-400" />}
                title="No timeline events"
                description="Agreement and approval activity will build the matter timeline."
                className="min-h-[240px] border-slate-200/60 bg-white/50"
              />
            )
          )}

          {tab === "notes" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-medium">Private notes for this client (saved locally until notes API ships).</p>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-slate-200 p-3 text-sm font-medium"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add matter notes…"
              />
            </div>
          )}

          {tab === "activity" && !loading && (
            activity.length ? (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 rounded-xl border border-slate-100 p-3 text-sm">
                    {a.type?.includes("sign") ? (
                      <FileSignature className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : a.type?.includes("approval") ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-[#081B2E]">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-slate-400" />}
                title="No activity"
                description="Workspace activity linked to this client will show here."
                className="min-h-[240px] border-slate-200/60 bg-white/50"
              />
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-2xl font-black text-[#081B2E] mt-1">{value}</div>
    </div>
  )
}
