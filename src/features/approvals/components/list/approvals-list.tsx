"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus, FileCheck2 } from "lucide-react"
import { ApprovalStatusBadge } from "../status-badge"
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
            <Button className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
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

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.8fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <div>Application</div>
            <div>Client</div>
            <div>Agent</div>
            <div>Status</div>
            <div>Due</div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileCheck2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-900">No application approvals</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((a) => (
                <Link
                  key={a.id}
                  href={`/workspace/${agencySlug}/approvals/${a.id}`}
                  className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.8fr] items-center px-6 py-4 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900">{a.approval_number || a.title}</div>
                    <div className="text-xs text-slate-500">{a.matter_types?.name || a.visa_subclass || "—"}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-700">{a.clients?.name || "—"}</div>
                  <div className="text-sm text-slate-600">{userMap[a.created_by] || "—"}</div>
                  <div><ApprovalStatusBadge status={a.status} /></div>
                  <div className="text-sm text-slate-500">
                    {a.lodgement_deadline
                      ? new Date(a.lodgement_deadline).toLocaleDateString()
                      : "—"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {count > 20 && (
          <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-slate-500 self-center">Page {page}</span>
            <Button variant="outline" size="sm" disabled={page * 20 >= count} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
