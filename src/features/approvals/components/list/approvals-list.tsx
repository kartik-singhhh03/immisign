"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus } from "lucide-react"
import { ApprovalStatusBadge } from "../status-badge"
import { ApprovalDashboardWidgets } from "../dashboard/approval-widgets"
import { PageEmptyState } from "@/components/ui/standards"
import { ImmiMateTable } from "@/components/ui/immimate-table"
import { APPROVAL_STATUSES } from "../../types/rebuild"

type Row = {
  id: string
  status: string
  matter_reference?: string | null
  visa_subclass?: string | null
  sent_at?: string | null
  clients?: { name: string; email?: string }
}

export function ApprovalsList({
  agencySlug,
}: {
  agencySlug: string
  agencyId?: string
  userMap?: Record<string, string>
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/application-approvals?${params}`, {
        credentials: "include",
      })
      const json = await res.json()
      let data: Row[] = json.data || []
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        data = data.filter(
          (r) =>
            r.clients?.name?.toLowerCase().includes(q) ||
            r.matter_reference?.toLowerCase().includes(q) ||
            r.clients?.email?.toLowerCase().includes(q),
        )
      }
      setRows(data)
      setTotal(json.total || data.length)
      setLoading(false)
    }
    load()
  }, [search, statusFilter])

  return (
    <div className="animate-enter space-y-6">
      <PageHeader
        eyebrow="Client sign-off"
        title="Application Approvals"
        description="Send final applications to clients for review and approval before lodgement."
        action={
          <Link href={`/workspace/${agencySlug}/approvals/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Approval
            </Button>
          </Link>
        }
      />

      <ApprovalDashboardWidgets agencySlug={agencySlug} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Client, matter reference, email…"
            className="h-10 rounded-xl border-slate-200 bg-white/70 pl-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-[200px] rounded-xl">
            <Filter className="mr-2 h-4 w-4 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPROVAL_STATUSES.filter((s) => s !== "draft").map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ImmiMateTable
          columns={[
            { key: "matter", header: "Matter" },
            { key: "client", header: "Client" },
            { key: "status", header: "Status" },
            { key: "sent", header: "Sent" },
          ]}
          data={[]}
          rowKey={() => "loading"}
          loading
        />
      ) : rows.length === 0 && !search && statusFilter === "all" ? (
        <PageEmptyState
          module="approvals"
          actionHref={`/workspace/${agencySlug}/approvals/new`}
        />
      ) : (
        <ImmiMateTable
          columns={[
            {
              key: "matter",
              header: "Matter",
              render: (a: Row) => (
                <div>
                  <div className="font-semibold text-[#111111]">
                    {a.matter_reference || "—"}
                  </div>
                  <div className="text-xs text-[#5C5C5C]">{a.visa_subclass || "—"}</div>
                </div>
              ),
            },
            {
              key: "client",
              header: "Client",
              render: (a: Row) => a.clients?.name || "—",
            },
            {
              key: "status",
              header: "Status",
              render: (a: Row) => <ApprovalStatusBadge status={a.status} />,
            },
            {
              key: "sent",
              header: "Sent",
              render: (a: Row) =>
                a.sent_at ? new Date(a.sent_at).toLocaleDateString() : "—",
            },
          ]}
          data={rows}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/workspace/${agencySlug}/approvals/${a.id}`)}
          emptyTitle="No approvals match"
          emptyDescription="Try adjusting your search or status filter."
          page={1}
          pageSize={50}
          total={total}
          onPageChange={() => undefined}
        />
      )}
    </div>
  )
}
