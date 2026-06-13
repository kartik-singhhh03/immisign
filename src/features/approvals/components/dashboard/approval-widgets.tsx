"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Eye, Send } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type WidgetData = {
  pendingReview: number
  viewed: number
  approved: number
  changesRequested: number
}

function WidgetSkeleton() {
  return (
    <Card className="h-full rounded-2xl border-slate-200/60">
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-5 w-5 rounded-md" />
        <Skeleton className="h-8 w-12" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  )
}

export function ApprovalDashboardWidgets({ agencySlug }: { agencySlug: string }) {
  const [widgets, setWidgets] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/approvals/widgets", { credentials: "include" })
      .then(async (r) => {
        const j = await r.json()
        if (!cancelled && j.success && j.widgets) setWidgets(j.widgets)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const items = widgets
    ? [
        {
          label: "Pending Review",
          value: widgets.pendingReview,
          icon: Send,
          href: `/workspace/${agencySlug}/approvals?status=sent`,
          color: "text-amber-600",
        },
        {
          label: "Viewed",
          value: widgets.viewed,
          icon: Eye,
          href: `/workspace/${agencySlug}/approvals?status=viewed`,
          color: "text-blue-600",
        },
        {
          label: "Approved",
          value: widgets.approved,
          icon: CheckCircle2,
          href: `/workspace/${agencySlug}/approvals?status=approved`,
          color: "text-emerald-600",
        },
        {
          label: "Changes Requested",
          value: widgets.changesRequested,
          icon: AlertCircle,
          href: `/workspace/${agencySlug}/approvals?status=changes_requested`,
          color: "text-red-600",
        },
      ]
    : []

  return (
    <div className="space-y-4" data-testid="approval-dashboard-widgets">
      <h2 className="text-lg font-black text-[#111111]">Application Approvals</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <WidgetSkeleton key={i} />)
          : items.map((item) => (
              <Link key={item.label} href={item.href}>
                <Card className="h-full rounded-2xl border-slate-200/60 transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <item.icon className={`mb-2 h-5 w-5 ${item.color}`} />
                    <div className="text-2xl font-black text-[#111111]">{item.value}</div>
                    <div className="mt-1 text-[11px] font-bold leading-tight text-slate-500">
                      {item.label}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </div>
  )
}
