"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ClipboardList,
  FileCheck2,
  FileSignature,
  ScrollText,
  Send,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { ApprovalDashboardWidgets } from "@/features/approvals/components/dashboard/approval-widgets"
import { AgreementDashboardWidgets } from "@/features/agreements/components/dashboard/agreement-widgets"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type SummaryPayload = {
  pendingSignatures?: { id: string; title?: string; clients?: { name?: string } }[]
  recentNotifications?: { id: string; title?: string; message?: string; read?: boolean; created_at?: string }[]
  recentActivity?: { id: string; title?: string; description?: string; created_at?: string }[]
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Link href={href}>
        <Card className="h-full rounded-2xl border-slate-200/70 transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111111] text-white">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-[#111111]">{label}</span>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

export function AgentDashboardPage() {
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const slug = activeWorkspace?.slug || "workspace"
  const [loading, setLoading] = React.useState(true)
  const [summary, setSummary] = React.useState<SummaryPayload | null>(null)
  const [recentClients, setRecentClients] = React.useState<
    { id: string; name: string; email?: string }[]
  >([])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [sumRes, clientsRes] = await Promise.all([
          fetch("/api/dashboard/summary", { credentials: "include" }),
          fetch("/api/clients?limit=5&sort=created_at&direction=desc", { credentials: "include" }).catch(
            () => null,
          ),
        ])
        const sumJson = await sumRes.json()
        if (!cancelled && sumJson.success) setSummary(sumJson.summary)
        if (clientsRes?.ok) {
          const cJson = await clientsRes.json()
          if (!cancelled && cJson.data) setRecentClients(cJson.data.slice(0, 5))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const quickActions = [
    { label: "New Service Agreement", href: `/workspace/${slug}/agreements/new`, icon: FileSignature },
    { label: "Send Document For Signature", href: `/workspace/${slug}/documents/send`, icon: Send },
    { label: "New Application Approval", href: `/workspace/${slug}/approvals/new`, icon: FileCheck2 },
    { label: "Create File Note", href: `/workspace/${slug}/file-notes`, icon: ClipboardList },
    { label: "Create SOS", href: `/workspace/${slug}/service-statements/new`, icon: ScrollText },
  ]

  if (loading) return <DashboardSkeleton />

  const notifications = summary?.recentNotifications || []
  const pendingSignatures = summary?.pendingSignatures || []
  const activity = summary?.recentActivity || []

  return (
    <motion.div
      className="space-y-10 pb-10 animate-enter"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back"
        description="Your fastest path to agreements, signatures, and client approvals."
      />

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Today&apos;s Work</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-slate-200/70">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-[#111111]">Pending Signatures</h3>
              {pendingSignatures.length === 0 ? (
                <p className="text-sm text-slate-500">No agreements awaiting signature.</p>
              ) : (
                pendingSignatures.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/workspace/${slug}/agreements/${item.id}`}
                    className="block rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    {item.title || "Agreement"} · {item.clients?.name || "Client"}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-[#111111]">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                    <p className="font-semibold text-[#111111]">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Pipeline</h2>
        <AgreementDashboardWidgets agencySlug={slug} />
        <ApprovalDashboardWidgets agencySlug={slug} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Notifications</h2>
          <Button asChild variant="ghost" size="sm" className="text-xs font-bold">
            <Link href={`/workspace/${slug}/notifications`}>View all</Link>
          </Button>
        </div>
        <Card className="rounded-2xl border-slate-200/70">
          <CardContent className="divide-y divide-slate-100 p-0">
            {notifications.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No notifications.</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className="px-5 py-3 text-sm">
                  <p className="font-semibold text-[#111111]">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Recent Clients</h2>
        <Card className="rounded-2xl border-slate-200/70">
          <CardContent className="divide-y divide-slate-100 p-0">
            {recentClients.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No clients yet.</p>
            ) : (
              recentClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/workspace/${slug}/clients/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="font-semibold text-[#111111]">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.email}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </motion.div>
  )
}
