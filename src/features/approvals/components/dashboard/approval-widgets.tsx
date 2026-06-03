"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Send,
  UserCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type WidgetData = {
  awaitingReview: number
  awaitingApproval: number
  changesRequested: number
  readyToLodge: number
  recentlyApproved: number
  myAssignedReviews: number
  openChecklistItems: number
}

export function ApprovalDashboardWidgets({ agencySlug }: { agencySlug: string }) {
  const [widgets, setWidgets] = useState<WidgetData | null>(null)

  useEffect(() => {
    fetch("/api/approvals/widgets")
      .then(async (r) => {
        const text = await r.text()
        try {
          const j = text ? JSON.parse(text) : {}
          if (j.success && j.widgets) setWidgets(j.widgets)
        } catch {
          /* ignore parse errors */
        }
      })
      .catch(() => {})
  }, [])

  if (!widgets) return null

  const items = [
    {
      label: "Awaiting review",
      value: widgets.awaitingReview,
      icon: Send,
      href: `/workspace/${agencySlug}/approvals?status=submitted,under_review`,
      color: "text-amber-600",
    },
    {
      label: "Awaiting approval",
      value: widgets.awaitingApproval,
      icon: UserCheck,
      href: `/workspace/${agencySlug}/approvals?status=under_review`,
      color: "text-blue-600",
    },
    {
      label: "Changes requested",
      value: widgets.changesRequested,
      icon: AlertCircle,
      href: `/workspace/${agencySlug}/approvals?status=changes_requested`,
      color: "text-red-600",
    },
    {
      label: "Ready to lodge",
      value: widgets.readyToLodge,
      icon: FileCheck2,
      href: `/workspace/${agencySlug}/approvals?status=ready_to_lodge`,
      color: "text-teal-600",
    },
    {
      label: "Recently approved (7d)",
      value: widgets.recentlyApproved,
      icon: CheckCircle2,
      href: `/workspace/${agencySlug}/approvals?status=approved`,
      color: "text-emerald-600",
    },
    {
      label: "My assigned reviews",
      value: widgets.myAssignedReviews,
      icon: ClipboardList,
      href: `/workspace/${agencySlug}/approvals`,
      color: "text-indigo-600",
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-[#081B2E]">Application approvals</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="rounded-2xl border-slate-200/60 hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4">
                <item.icon className={`h-5 w-5 mb-2 ${item.color}`} />
                <div className="text-2xl font-black text-[#081B2E]">{item.value}</div>
                <div className="text-[11px] font-bold text-slate-500 mt-1 leading-tight">{item.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {widgets.openChecklistItems > 0 && (
        <p className="text-xs font-semibold text-slate-500">
          {widgets.openChecklistItems} open checklist items across active applications
        </p>
      )}
    </div>
  )
}
