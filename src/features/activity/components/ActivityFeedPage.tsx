"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type Log = {
  id: string
  type: string
  title: string
  description?: string
  reference_type?: string
  reference_id?: string
  created_at: string
}

export function ActivityFeedPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "25" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/activity?${params}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setCount(json.count)
      }
      setLoading(false)
    }
    load()
  }, [page, search])

  return (
    <div className="animate-enter max-w-4xl mx-auto pb-12">
      <PageHeader
        eyebrow="Agency"
        title="Activity feed"
        description="Chronological audit of actions across agreements, approvals, and documents."
      />
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search activity…"
          className="pl-10 rounded-xl"
        />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
        {loading ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No activity found</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-6 py-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#081B2E]">{log.title}</p>
                  {log.description && (
                    <p className="text-sm text-slate-600 mt-0.5">{log.description}</p>
                  )}
                  <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                    {log.type}
                    {log.reference_type && ` · ${log.reference_type}`}
                  </p>
                </div>
                <time className="text-xs text-slate-500 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
            </div>
          ))
        )}
      </div>
      {count > 25 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm font-bold text-slate-600"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            type="button"
            disabled={page * 25 >= count}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm font-bold text-slate-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
