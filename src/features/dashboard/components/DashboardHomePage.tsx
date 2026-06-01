"use client"

import * as React from "react"
import { useAuthStore } from "@/store/authStore"
import { useApprovalStore } from "@/store/approvalStore"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileArchive,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UploadCloud,
  ShieldCheck,
  Trash2,
  X,
  Palette,
  Users,
  ShieldAlert,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { StatusPill } from "@/components/saas/dashboard-pages"

import { useDashboardMetrics, useAgreements, useApprovals } from "@/lib/hooks/useSupabaseData"

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="animate-enter mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]">{eyebrow}</div>}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081B2E] md:text-4xl">{title}</h1>
        <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-slate-500 font-medium">{description}</p>
      </div>
      {action}
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string
  value: string
  change: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="group rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(8,27,46,0.02),0_18px_48px_rgba(8,27,46,0.05)] hover:border-slate-350/50">
      <CardContent className="relative p-6">
        <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-[#0D9F8C]/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100/50 bg-gradient-to-b from-[#f3fcf9] to-[#ffffff] text-[#0D9F8C] shadow-[0_4px_12px_rgba(13,159,140,0.05)] group-hover:scale-105 transition-transform duration-300">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-emerald-100/50 bg-emerald-50/50 px-2.5 py-0.5 text-xs font-bold text-[#0A8F7E]">{change}</span>
        </div>
        <div className="mt-6 text-[12px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-1.5 text-3xl font-bold tracking-tight text-[#081B2E]">{value}</div>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-slate-100/80">
          <div className="chart-bar h-full rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]" style={{ width: "72%" }} />
        </div>
      </CardContent>
    </Card>
  )
}

function AgreementTable() {
  const { data: agreements, loading } = useAgreements()
  
  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading agreements...</div>
  if (!agreements?.length) return <div className="p-8 text-center text-slate-500 font-medium">No recent agreements.</div>

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
      <div className="grid grid-cols-[1.1fr_1.2fr_0.7fr_0.8fr_0.8fr_0.2fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 max-lg:hidden">
        <div>Client</div>
        <div>Matter</div>
        <div>Professional Fee</div>
        <div>Signing Status</div>
        <div>Sent Date</div>
        <div />
      </div>
      <div className="divide-y divide-slate-100">
        {agreements.map((agreement) => (
          <div
            key={agreement.id}
            className="group grid gap-3 px-6 py-4 transition-all duration-200 hover:bg-white/80 lg:grid-cols-[1.1fr_1.2fr_0.7fr_0.8fr_0.8fr_0.2fr] lg:items-center text-xs font-semibold"
          >
            <div>
              <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{agreement.client}</div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">{agreement.id}</div>
            </div>
            <div className="text-slate-600">{agreement.matter}</div>
            <div className="font-bold text-[#081B2E]">{agreement.fee}</div>
            <div><StatusPill status={agreement.status} /></div>
            <div className="text-slate-400 font-medium">{agreement.date}</div>
            <div className="flex justify-end">
              <MoreHorizontal className="h-5 w-5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniChart() {
  return (
    <Card className="group relative h-80 overflow-hidden rounded-2xl border border-slate-200/50 bg-white/60 p-6 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(8,27,46,0.02),0_18px_48px_rgba(8,27,46,0.05)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Throughput</div>
          <div className="mt-1 text-xl font-bold tracking-tight text-[#081B2E]">Agreement velocity</div>
        </div>
        <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-[#0D9F8C] shadow-sm">+18.4% this week</div>
      </div>
      <div className="relative mt-8 h-48 w-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 720 200" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0D9F8C" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0D9F8C" stopOpacity="0.00" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {[20, 60, 100, 140, 180].map((y) => (
            <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#f1f5f3" strokeDasharray="6 8" strokeWidth="1" />
          ))}
          <path d="M0 150 C80 120 115 110 170 90 C245 65 255 35 320 45 C390 55 395 140 458 130 C520 120 545 95 610 88 C660 82 690 70 720 65 L720 200 L0 200 Z" fill="url(#areaFill)" />
          <path className="chart-line" d="M0 150 C80 120 115 110 170 90 C245 65 255 35 320 45 C390 55 395 140 458 130 C520 120 545 95 610 88 C660 82 690 70 720 65" fill="none" stroke="#0D9F8C" strokeWidth="3" strokeLinecap="round" style={{ filter: "url(#glow)" }} />
          {[0, 170, 320, 458, 610, 720].map((x, index) => {
            const y = [150, 90, 45, 130, 88, 65][index]
            return (
              <g key={x} className="group/dot cursor-pointer">
                <circle cx={x} cy={y} r="8" fill="#0D9F8C" fillOpacity="0.12" className="transition-all duration-300 group-hover/dot:fill-opacity-30 group-hover/dot:r-10" />
                <circle cx={x} cy={y} r="4" fill="#0D9F8C" stroke="white" strokeWidth="2.5" className="shadow-sm transition-all duration-300 group-hover/dot:scale-110" />
              </g>
            )
          })}
        </svg>
      </div>
    </Card>
  )
}

export function DashboardHomePage() {
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)
  const { user } = useAuthStore()
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboardMetrics()
  const { data: approvalsData, loading: approvalsLoading } = useApprovals()
  
  const currentId = activeWorkspace?.id || "w-avc"
  const currentSlug = activeWorkspace?.slug || "avc-migration"
  const currentRole = user?.role || "Owner"
  const currentUserName = user?.name || "Practitioner"

  const pendingApprovals = approvalsData || []

  // Dynamic Metrics override
  const realMetrics = [
    { label: "Active Clients", value: (dashboardData?.metrics?.activeClients || 0).toString(), change: "Total", icon: Users },
    { label: "Agreements", value: (dashboardData?.metrics?.activeAgreements || 0).toString(), change: "Total", icon: FileSignature },
    { label: "Approvals", value: (dashboardData?.metrics?.pendingApprovals || 0).toString(), change: "Pending", icon: Clock3 },
    { label: "This month", value: dashboardData?.metrics?.monthlyRevenue || "$0", change: "Projected", icon: BarChart3 },
  ];

  const realNotifications = dashboardData?.activity?.map((a: any) => ({
    title: a.title,
    description: a.description,
    time: a.time
  })) || [];

  // -------------------------------------------------------------
  // ROLE-AWARE CONTENT CONFIGURATION
  // -------------------------------------------------------------
  const roleContent = {
    Owner: {
      pulse: `${dashboardData?.metrics?.activeAgreements || 0} active agreements moving forward. Revenue: ${dashboardData?.metrics?.monthlyRevenue || '$0'}.`,
      subItems: ["Zero overdue", `${dashboardData?.metrics?.pendingApprovals || 0} approvals`, "All tasks tracked"],
      actionTitle: "Review awaiting signatures",
      actionText: "Check your open matters and send reminders to clients who haven't signed yet.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "Create agreement", icon: FileSignature, href: `/workspace/${currentSlug}/agreements/new` },
        { label: "New Application Review", icon: FileCheck2, href: `/workspace/${currentSlug}/approvals/new` },
        { label: "Send document", icon: Send, href: `/workspace/${currentSlug}/documents/send` },
        { label: "Upload template", icon: UploadCloud, href: `/workspace/${currentSlug}/documents` },
      ]
    },
    Admin: {
      pulse: "All 5 practitioner licenses are in active compliance with ABN & MARN regulatory standards.",
      subItems: ["Tamper-free logs", "1 billing review", "Database synced"],
      actionTitle: "Audit Active Sessions",
      actionText: "A security session was opened from a new IP in Melbourne. Review team profiles to confirm access.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "Manage Team Access", icon: Users, href: `/workspace/${currentSlug}/settings?section=Team` },
        { label: "Audit Log Trail", icon: FileText, href: `/workspace/${currentSlug}/settings?section=Security` },
        { label: "Subscription Pricing", icon: CreditCard, href: `/workspace/${currentSlug}/billing` },
        { label: "Review default forms", icon: FileCheck2, href: `/workspace/${currentSlug}/settings?section=Matter Types` },
      ]
    },
    "Migration Agent": {
      pulse: "4 pending subclass 820 partner visa applications require client documents before end of week.",
      subItems: ["4 visa drafts", "1 assessment due", "OMARA checklist OK"],
      actionTitle: "Evidentiary Review Queue",
      actionText: "Client Gurpreet Singh has submitted 3 identity certificates. Check translation stamps and verify seals.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "Create visa agreement", icon: FileSignature, href: `/workspace/${currentSlug}/agreements/new` },
        { label: "Start Application Review", icon: FileCheck2, href: `/workspace/${currentSlug}/approvals/new` },
        { label: "Upload Identity Files", icon: UploadCloud, href: `/workspace/${currentSlug}/documents/send` },
        { label: "View Clients Matched", icon: Users, href: `/workspace/${currentSlug}/clients` },
      ]
    },
    "Case Manager": {
      pulse: "2 skills assessments lodged successfully. evidentiary drafts are under review by case administrators.",
      subItems: ["2 skills pending", "3 active reviews", "1 files audit alert"],
      actionTitle: "Complete checklist tasks",
      actionText: "Elena Zhao's Aged Dependent Relative files have missing partner signatures. Trigger an immediate request.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "Upload Evidentiary PDF", icon: UploadCloud, href: `/workspace/${currentSlug}/documents/send` },
        { label: "Verify checklists", icon: FileCheck2, href: `/workspace/${currentSlug}/approvals` },
        { label: "Open Document Directory", icon: FolderOpen, href: `/workspace/${currentSlug}/documents` },
        { label: "List case clients", icon: Users, href: `/workspace/${currentSlug}/clients` },
      ]
    },
    Assistant: {
      pulse: "Clerical Tasks: 6 translation checklists completed. 2 client documents pending certified scan.",
      subItems: ["6 translations OK", "2 files to scan", "1 folder organize"],
      actionTitle: "Upload scanned dossiers",
      actionText: "Amanpreet Kaur has dropped certified passport copies in the entry tray. Scan, verify clarity, and save to secure storage.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "Upload Client Files", icon: UploadCloud, href: `/workspace/${currentSlug}/documents/send` },
        { label: "Document Library", icon: FolderOpen, href: `/workspace/${currentSlug}/documents` },
        { label: "View Active Clients", icon: Users, href: `/workspace/${currentSlug}/clients` },
        { label: "Review agreements queue", icon: FileSignature, href: `/workspace/${currentSlug}/agreements` },
      ]
    },
    "Read-only staff": {
      pulse: "Read-only workspace review mode: All operational audits are active, verified, and tamper-free.",
      subItems: ["Logs locked", "Integrations ok", "Billing secure"],
      actionTitle: "Tamper-Free Audit Logs",
      actionText: "Every document transaction, IP access, and state transition is permanently recorded in our secure postgres ledger.",
      metrics: realMetrics,
      notifications: realNotifications,
      actions: [
        { label: "View compliance logs", icon: FileText, href: `/workspace/${currentSlug}/settings?section=Security` },
        { label: "Inspect Document Directory", icon: FolderOpen, href: `/workspace/${currentSlug}/documents` },
        { label: "List active clients", icon: Users, href: `/workspace/${currentSlug}/clients` },
        { label: "Agreements read-only", icon: FileSignature, href: `/workspace/${currentSlug}/agreements` },
      ]
    }
  } as const

  const display = roleContent[currentRole as keyof typeof roleContent] || roleContent.Owner

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Practice command centre"
        title={`Good day, ${currentUserName}`}
        description="A calm overview of agreements, signatures, documents and team activity across the practice."
        action={
          currentRole !== "Read-only staff" && (
            <Button asChild className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
              <Link href={`/workspace/${currentSlug}/agreements/new`}>
                <Plus className="h-4 w-4 mr-1.5" />New Agreement
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive pulse</div>
          <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900">
            {display.pulse}
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {display.subItems.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-100">
                <Check className="h-4 w-4 text-[#0D9F8C]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Next best action</div>
              <h2 className="mt-3 text-lg font-bold text-slate-900 tracking-tight">{display.actionTitle}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500 font-medium">{display.actionText}</p>
          <Button asChild variant="outline" className="mt-6 h-10 w-full rounded-xl bg-white font-semibold border-slate-200 shadow-sm text-slate-700">
            <Link href={`/workspace/${currentSlug}/application-approvals`}>Open queue</Link>
          </Button>
        </div>
      </div>

      <div className="stagger-children grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardError ? (
          <div className="col-span-4 p-8 text-center text-red-500 font-medium border border-red-100 bg-red-50 rounded-2xl">
            Failed to load dashboard metrics.
          </div>
        ) : dashboardLoading ? (
          <div className="col-span-4 p-8 text-center text-slate-500 font-medium">
            Loading metrics...
          </div>
        ) : (
          display.metrics.map((m: any, idx: number) => (
            <MetricCard key={idx} label={m.label} value={m.value} change={m.change} icon={m.icon} />
          ))
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <MiniChart />
        </div>
        <Card className="rounded-[1.35rem] border-white/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Notifications</h2>
              {display.notifications.length > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">{display.notifications.length} new</span>}
            </div>
            <div className="mt-5 space-y-4">
              {dashboardLoading ? (
                <div className="p-4 text-center text-sm text-slate-500">Loading activity...</div>
              ) : display.notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No new notifications.</div>
              ) : (
                display.notifications.map((item: any, index: number) => (
                  <div key={index} className="flex gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white">
                    <Bell className="mt-0.5 h-4 w-4 text-[#0D9F8C]" />
                    <div>
                      <p className="text-sm font-bold">{item.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div>
          <h2 className="mb-3 text-xl font-black">Pending Approvals</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/60 shadow-sm">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div>Client & Application</div>
              <div>Agent</div>
              <div>Status</div>
              <div>Deadline</div>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingApprovals.slice(0, 5).map((approval: any) => (
                <Link
                  key={approval.id}
                  href={`/workspace/${currentSlug}/approvals/${approval.id}`}
                  className="group grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{approval.client}</div>
                    <div className="text-xs font-semibold text-slate-400 mt-0.5">{approval.type}</div>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">Assigned Agent</div>
                  <div>
                    <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/90 text-amber-700 px-2.5 py-0.5 text-xs font-bold tracking-wide">
                      {approval.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-400">
                    {approval.date}
                  </div>
                </Link>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-medium">No pending approvals.</div>
              )}
            </div>
          </div>

          <h2 className="mb-3 mt-8 text-xl font-black">Recent agreements</h2>
          <AgreementTable />
        </div>

        <Card className="rounded-[1.35rem] border-white/70">
          <CardContent className="p-6">
            <h2 className="text-xl font-black">Quick actions</h2>
            <div className="mt-5 grid gap-3">
              {display.actions.map((action) => (
                <Link key={action.label} href={action.href} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 font-bold transition-colors hover:bg-[#F7FAF8]">
                  <span className="flex items-center gap-3"><action.icon className="h-5 w-5 text-[#0D9F8C]" />{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
