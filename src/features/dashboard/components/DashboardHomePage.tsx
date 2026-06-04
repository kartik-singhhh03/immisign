"use client"

import * as React from "react"
import { useAuthStore } from "@/store/authStore"
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
  MoreHorizontal,
  Plus,
  Send,
  UploadCloud,
  Users,
  ShieldAlert,
  Activity,
  UserPlus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { StatusPill } from "@/components/saas/dashboard-pages"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { 
  useDashboardMetrics, 
  useAgreements, 
  usePendingSignatures, 
  useTeamActivity 
} from "@/lib/hooks/useSupabaseData"
import { ApprovalDashboardWidgets } from "@/features/approvals/components/dashboard/approval-widgets"
import { DashboardCommunications } from "@/features/dashboard/components/DashboardCommunications"

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
  trend,
  icon: Icon
}: { 
  label: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType
}) {
  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="absolute -right-4 -top-4 rounded-full bg-[#0D9F8C]/5 p-8 transition-transform group-hover:scale-150 group-hover:bg-[#0D9F8C]/10">
        <Icon className="h-8 w-8 text-[#0D9F8C]/40" />
      </div>
      <CardContent className="p-0 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-[#0D9F8C]">
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : trend === 'down' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
          )}>
            {change}
          </div>
        </div>
        <div className="mt-4 text-4xl font-black tracking-tight text-[#081B2E]">{value}</div>
        <div className="mt-1 text-[13px] font-bold text-slate-500">{label}</div>
      </CardContent>
    </Card>
  )
}

function AgreementTable({ workspaceSlug }: { workspaceSlug: string }) {
  const { data: agreements, loading } = useAgreements()
  
  if (loading) return <div className="p-8 text-center text-slate-400 font-semibold animate-pulse">Loading agreements...</div>
  if (!agreements?.length) return <div className="p-8 text-center text-slate-500 font-medium">No recent agreements found.</div>

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-sm">
      <div className="grid grid-cols-[1.1fr_1.2fr_0.7fr_0.8fr_0.8fr_0.2fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 max-lg:hidden">
        <div>Client</div>
        <div>Matter</div>
        <div>Professional Fee</div>
        <div>Status</div>
        <div>Created</div>
        <div />
      </div>
      <div className="divide-y divide-slate-100">
        {agreements.map((agreement) => (
          <div
            key={agreement.id}
            className="group grid gap-3 px-6 py-4 transition-all duration-200 hover:bg-slate-50/80 lg:grid-cols-[1.1fr_1.2fr_0.7fr_0.8fr_0.8fr_0.2fr] lg:items-center text-xs font-semibold"
          >
            <div>
              <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{agreement.client}</div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">{agreement.id.slice(0,8)}...</div>
            </div>
            <div className="text-slate-600 truncate pr-4">{agreement.matter}</div>
            <div className="font-bold text-[#081B2E]">{agreement.fee}</div>
            <div><StatusPill status={agreement.status} /></div>
            <div className="text-slate-400 font-medium">{agreement.date}</div>
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  <DropdownMenuItem asChild>
                    <Link href={`/workspace/${workspaceSlug}/agreements/${agreement.real_id || agreement.id}`}>
                      Open workspace
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PendingSignatures() {
  const { data: pending, loading } = usePendingSignatures();

  if (loading) return <div className="p-6 text-center text-slate-400 font-semibold animate-pulse">Loading signatures...</div>
  if (!pending?.length) return (
    <div className="py-10 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      </div>
      <p className="text-sm font-semibold text-slate-500">No pending signatures.</p>
    </div>
  )

  return (
    <div className="divide-y divide-slate-100 px-2">
      {pending.map((p) => (
        <div key={p.id} className="flex gap-4 py-4 group cursor-pointer hover:bg-slate-50/50 px-4 rounded-xl transition-colors">
           <div className="flex-1 space-y-1 truncate">
             <p className="text-sm font-bold text-[#081B2E] truncate">{p.clients?.name || 'Unknown Client'}</p>
             <p className="text-xs font-medium text-slate-500 truncate">{p.title}</p>
           </div>
           <div className="flex flex-col items-end justify-center gap-1 shrink-0">
             <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/90 text-amber-700 px-2 py-0.5 text-[10px] font-bold tracking-wide">
               AWAITING
             </span>
           </div>
        </div>
      ))}
    </div>
  )
}

function TeamActivity() {
  const { data: logs, loading } = useTeamActivity();

  if (loading) return <div className="p-6 text-center text-slate-400 font-semibold animate-pulse">Loading activity...</div>
  if (!logs?.length) return (
    <div className="py-10 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
        <Activity className="h-5 w-5 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-500">No team activity.</p>
    </div>
  )

  return (
    <div className="divide-y divide-slate-100 px-2">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4 py-4 group cursor-pointer hover:bg-slate-50/50 px-4 rounded-xl transition-colors">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Users className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1 truncate">
            <p className="text-sm font-bold text-[#081B2E] truncate">{log.title}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{log.description}</p>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
              <Clock3 className="h-3 w-3" /> {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardHomePage() {
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)
  const { user } = useAuthStore()
  const { data: dashboardData, loading: dashboardLoading } = useDashboardMetrics()
  
  const currentSlug = activeWorkspace?.slug || "workspace"
  const currentUserName = user?.name || "Practitioner"

  const realMetrics = [
    { label: "Active Clients", value: (dashboardData?.metrics?.activeClients || 0).toString(), change: "", trend: "neutral" as const, icon: Users },
    { label: "Active Agreements", value: (dashboardData?.metrics?.activeAgreements || 0).toString(), change: "", trend: "neutral" as const, icon: FileSignature },
    { label: "Pending Approvals", value: (dashboardData?.metrics?.pendingApprovals || 0).toString(), change: "", trend: "neutral" as const, icon: Clock3 },
    { label: "Professional fees (sum)", value: dashboardData?.metrics?.monthlyRevenue || "$0", change: "", trend: "neutral" as const, icon: BarChart3 },
  ];

  const quickActions = [
    { label: "New Client", icon: Plus, href: `/workspace/${currentSlug}/clients` },
    { label: "New Application", icon: FileCheck2, href: `/workspace/${currentSlug}/approvals/new` },
    { label: "New Agreement", icon: FileSignature, href: `/workspace/${currentSlug}/agreements/new` },
    { label: "Invite Team Member", icon: UserPlus, href: `/workspace/${currentSlug}/settings?section=Team` },
    { label: "Upload Document", icon: UploadCloud, href: `/workspace/${currentSlug}/documents` },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${currentUserName.split(' ')[0]}`}
        description="Here is what's happening with your practice today."
        action={
          <Button asChild className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
            <Link href={`/workspace/${currentSlug}/agreements/new`}>Create Agreement</Link>
          </Button>
        }
      />

      {/* KPI METRICS */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {realMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mb-8">
        <ApprovalDashboardWidgets agencySlug={currentSlug} />
      </div>

      <DashboardCommunications />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm flex flex-col overflow-hidden">
             <div className="p-6 pb-4">
               <h2 className="text-lg font-black text-[#081B2E] tracking-tight">Growth Trend</h2>
               <p className="text-xs font-medium text-slate-500 mt-1">Revenue vs Active Cases (30 days)</p>
             </div>
             <CardContent className="p-6 pt-0 flex-1 relative">
               <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10" />
               <div className="w-full h-full min-h-[250px] relative border-b border-l border-slate-100 flex items-end justify-between px-4 pb-2">
                  {[40, 70, 45, 90, 65, 100, 85].map((h, i) => (
                    <div key={i} className="w-8 bg-gradient-to-t from-[#0D9F8C]/20 to-[#0D9F8C] rounded-t-md opacity-80" style={{ height: `${h}%` }} />
                  ))}
               </div>
             </CardContent>
          </Card>

          <div>
             <h2 className="mb-3 mt-4 text-xl font-black text-[#081B2E]">Recent Agreements</h2>
             <AgreementTable workspaceSlug={currentSlug} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          <Card className="rounded-3xl border-slate-200/50 bg-white/60 shadow-sm overflow-hidden">
            <div className="p-6 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-black text-[#081B2E] tracking-tight">Quick Actions</h2>
            </div>
            <CardContent className="p-4 grid gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 font-bold transition-all hover:border-[#0D9F8C]/30 hover:bg-[#F7FAF8] hover:shadow-sm group">
                  <span className="flex items-center gap-3 text-sm text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors"><action.icon className="h-5 w-5 text-[#0D9F8C]" />{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D9F8C] transition-colors group-hover:translate-x-1" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/50 bg-white/60 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-[#081B2E] tracking-tight">Pending Signatures</h2>
                <p className="text-[11px] font-bold text-amber-600 mt-1">Awaiting client action</p>
              </div>
            </div>
            <CardContent className="p-2 flex-1 overflow-y-auto">
              <PendingSignatures />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/50 bg-white/60 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-[#081B2E] tracking-tight">Team Activity</h2>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Latest platform events</p>
              </div>
            </div>
            <CardContent className="p-2 flex-1 overflow-y-auto">
              <TeamActivity />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
