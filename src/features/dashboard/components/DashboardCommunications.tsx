"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"

const EMPTY_SUMMARY = {
  myTasks: [],
  myReviews: [],
  recentNotifications: [],
  recentActivity: [],
  upcomingDeadlines: [],
  overdueApprovals: [],
  pendingSignatures: [],
}

type Summary = typeof EMPTY_SUMMARY

async function fetchDashboardSummary(): Promise<{
  summary: Summary
  error: string | null
}> {
  try {
    const res = await fetch("/api/dashboard/summary")
    const text = await res.text()
    let json: { success?: boolean; summary?: Summary; error?: string } = {}
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        return {
          summary: EMPTY_SUMMARY,
          error: res.ok ? "Invalid response from server" : `Server error (${res.status})`,
        }
      }
    }
    if (!res.ok || json.success === false) {
      return {
        summary: json.summary ?? EMPTY_SUMMARY,
        error: json.error || `Unable to load dashboard summary (${res.status})`,
      }
    }
    return { summary: json.summary ?? EMPTY_SUMMARY, error: null }
  } catch (e: unknown) {
    return {
      summary: EMPTY_SUMMARY,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

export function DashboardCommunications() {
  const { slug: workspaceSlug } = useRequireWorkspace()
  const slug = workspaceSlug || "workspace"
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchDashboardSummary().then(({ summary: s, error }) => {
      if (cancelled) return
      setSummary(s)
      setLoadError(error)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const prefix = `/workspace/${slug}`

  if (!loaded) {
    return (
      <div className="mb-8 rounded-2xl border border-slate-200/60 bg-slate-50/80 p-6 text-sm text-slate-500">
        Loading communications…
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-6">
      <h2 className="text-lg font-black text-[#111111]">Communications & workload</h2>
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError}. Showing empty state — other dashboard sections still work.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-2xl border-slate-200/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-[#111111]" />
              <h3 className="text-sm font-bold">My tasks</h3>
            </div>
            {summary.myTasks.length === 0 ? (
              <p className="text-xs text-slate-500">No open tasks</p>
            ) : (
              <ul className="space-y-2">
                {summary.myTasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="text-xs font-semibold text-slate-700 flex justify-between gap-2">
                    <span className="truncate">{t.title}</span>
                    <span className="text-slate-400 shrink-0">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold">My reviews</h3>
            </div>
            {summary.myReviews.length === 0 ? (
              <p className="text-xs text-slate-500">Nothing assigned</p>
            ) : (
              <ul className="space-y-2">
                {summary.myReviews.map((a) => (
                  <li key={a.id}>
                    <Link href={`${prefix}/approvals/${a.id}`} className="text-xs font-bold text-[#111111] hover:underline">
                      {a.approval_number || a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSignature className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold">Pending signatures</h3>
            </div>
            <p className="text-2xl font-black text-[#111111]">{summary.pendingSignatures.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold">Recent notifications</h3>
            </div>
            {summary.recentNotifications.length === 0 ? (
              <p className="text-xs text-slate-500">No recent notifications</p>
            ) : (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {summary.recentNotifications.slice(0, 4).map((n) => (
                  <li key={n.id} className="text-xs">
                    <span className="font-bold text-slate-800">{n.title}</span>
                    {!n.is_read && <span className="ml-1 text-red-500">•</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-[#5C5C5C]" />
              <h3 className="text-sm font-bold">Upcoming deadlines (7 days)</h3>
            </div>
            {summary.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-500">None due soon</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-2">
                {summary.upcomingDeadlines.map((a) => (
                  <li key={a.id} className="text-xs font-semibold">
                    <Link href={`${prefix}/approvals/${a.id}`} className="text-[#111111] font-bold hover:underline">
                      {a.approval_number || a.title}
                    </Link>
                    <span className="text-slate-500 block">
                      {new Date(a.lodgement_deadline).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {summary.overdueApprovals.length > 0 && (
          <Card className="rounded-2xl border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-800">Overdue approvals</h3>
              </div>
              <ul className="space-y-1">
                {summary.overdueApprovals.map((a) => (
                  <li key={a.id}>
                    <Link href={`${prefix}/approvals/${a.id}`} className="text-xs font-bold text-red-700 hover:underline">
                      {a.approval_number || a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="rounded-2xl border-slate-200/60">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold mb-3">Recent activity</h3>
          {summary.recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500">No recent activity</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {summary.recentActivity.map((log) => (
                <div key={log.id} className="py-2 text-xs">
                  <p className="font-bold text-slate-800">{log.title}</p>
                  {log.description && <p className="text-slate-500">{log.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <Button variant="link" className="mt-2 p-0 h-auto text-xs font-bold text-[#111111]" asChild>
            <Link href={`${prefix}/activity`}>View full activity feed</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
