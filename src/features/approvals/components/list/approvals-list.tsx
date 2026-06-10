"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus, FileCheck2 } from "lucide-react"
import { ApprovalStatusBadge } from "../status-badge"
import { PageEmptyState } from "@/components/ui/standards"
import { ImmiMateTable } from "@/components/ui/immimate-table"
import { ApprovalStatus } from "../../types"

type Row = {
  id: string
  approval_number?: string
  title: string
  status: string
  visa_subclass?: string
  lodgement_deadline?: string
  clients?: { name: string }
  matter_types?: { name: string }
  created_by: string
}

export function ApprovalsList({
  agencySlug,
  agencyId,
  userMap,
}: {
  agencySlug: string
  agencyId: string
  userMap: Record<string, string>
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams({
        agencyId,
        page: String(page),
        limit: "20",
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/approvals?${params}`)
      const json = await res.json()
      if (json.success) {
        setRows(json.data || [])
        setCount(json.count || 0)
      }
      setLoading(false)
    }
    load()
  }, [agencyId, search, statusFilter, page])

  return (
    <div className="animate-enter space-y-6">
      <PageHeader
        eyebrow="Workflow"
        title="Application Approvals"
        description="Internal migration application review and lodgement workflow."
        action={
          <Link href={`/workspace/${agencySlug}/approvals/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Client, approval #, matter…"
            className="h-10 rounded-xl border-slate-200 bg-white/70 pl-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[200px] h-10 rounded-xl">
            <Filter className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(ApprovalStatus).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ImmiMateTable
          columns={[
            { key: "title", header: "Application" },
            { key: "client", header: "Client" },
            { key: "agent", header: "Agent" },
            { key: "status", header: "Status" },
            { key: "due", header: "Due" },
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
              key: "title",
              header: "Application",
              render: (a: Row) => (
                <div>
                  <div className="font-semibold text-[#111111]">{a.approval_number || a.title}</div>
                  <div className="text-xs text-[#5C5C5C]">{a.matter_types?.name || a.visa_subclass || "—"}</div>
                </div>
              ),
            },
            {
              key: "client",
              header: "Client",
              render: (a: Row) => a.clients?.name || "—",
            },
            {
              key: "agent",
              header: "Agent",
              render: (a: Row) => userMap[a.created_by] || "—",
            },
            {
              key: "status",
              header: "Status",
              render: (a: Row) => <ApprovalStatusBadge status={a.status} />,
            },
            {
              key: "due",
              header: "Due",
              render: (a: Row) =>
                a.lodgement_deadline
                  ? new Date(a.lodgement_deadline).toLocaleDateString()
                  : "—",
            },
          ]}
          data={rows}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/workspace/${agencySlug}/approvals/${a.id}`)}
          emptyTitle="No approvals match"
          emptyDescription="Try adjusting your search or status filter."
          page={page}
          pageSize={20}
          total={count}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
