"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, FileSignature, Send } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

type WidgetData = {
  pending: number
  sent: number
  awaitingSignature: number
  signed: number
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

export function AgreementDashboardWidgets({ agencySlug }: { agencySlug: string }) {
  const [widgets, setWidgets] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/agreements/widgets", { credentials: "include" })
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
          label: "Pending Agreements",
          value: widgets.pending,
          icon: FileSignature,
          href: `/workspace/${agencySlug}/agreements?status=draft`,
          color: "text-slate-600",
        },
        {
          label: "Sent Agreements",
          value: widgets.sent,
          icon: Send,
          href: `/workspace/${agencySlug}/agreements?status=sent`,
          color: "text-blue-600",
        },
        {
          label: "Awaiting Signature",
          value: widgets.awaitingSignature,
          icon: Clock,
          href: `/workspace/${agencySlug}/agreements?status=awaiting`,
          color: "text-amber-600",
        },
        {
          label: "Signed Agreements",
          value: widgets.signed,
          icon: CheckCircle2,
          href: `/workspace/${agencySlug}/agreements?status=signed`,
          color: "text-emerald-600",
        },
      ]
    : []

  return (
    <div className="space-y-4" data-testid="agreement-dashboard-widgets">
      <h2 className="text-lg font-black text-[#111111]">Service Agreements</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <WidgetSkeleton key={i} />)
          : items.map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <Link href={item.href}>
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
              </motion.div>
            ))}
      </div>
    </div>
  )
}
