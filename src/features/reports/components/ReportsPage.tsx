
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







function statusClass(status: string) {
  if (status === "Signed" || status === "Active") return "border-emerald-200/70 bg-emerald-50/90 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.04),0_8px_18px_rgba(16,185,129,0.10)]"
  if (status === "Awaiting" || status === "Awaiting signature") return "border-amber-200/70 bg-amber-50/90 text-amber-700 shadow-[0_8px_18px_rgba(245,158,11,0.10)]"
  if (status === "Sent" || status === "Document review") return "border-blue-200/70 bg-blue-50/90 text-blue-700 shadow-[0_8px_18px_rgba(59,130,246,0.10)]"
  if (status === "Expired") return "border-red-200/70 bg-red-50/90 text-red-700 shadow-[0_8px_18px_rgba(239,68,68,0.10)]"
  return "border-slate-200 bg-slate-100/80 text-slate-700"
}

function PageHeader({
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

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${statusClass(status)}`}>
      {status}
    </span>
  )
}

function Toolbar({ placeholder = "Search" }: { placeholder?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder={placeholder} className="h-12 rounded-2xl border-slate-200/50 bg-white/70 pl-11 shadow-[0_8px_20px_rgba(8,27,46,0.02)] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" />
      </div>
      <Button variant="outline" className="h-12 rounded-2xl border-slate-200/60 bg-white/70 px-5 font-bold hover:bg-slate-50 transition-colors">
        <Filter className="h-4 w-4" />
        Filters
      </Button>
    </div>
  )
}

function AgreementTable() {
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
          <Link
            key={agreement.id}
            href={`/agreements/${agreement.id}`}
            className="group grid gap-3 px-6 py-4 transition-all duration-200 hover:bg-white/80 lg:grid-cols-[1.1fr_1.2fr_0.7fr_0.8fr_0.8fr_0.2fr] lg:items-center"
          >
            <div>
              <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{agreement.client}</div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{agreement.id}</div>
            </div>
            <div className="text-sm font-semibold text-slate-600">{agreement.matter}</div>
            <div className="text-sm font-bold text-[#081B2E]">{agreement.fee}</div>
            <div><StatusPill status={agreement.status} /></div>
            <div className="text-sm font-medium text-slate-400">{agreement.date}</div>
            <div className="flex justify-end">
              <MoreHorizontal className="h-5 w-5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
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
          {/* Subtle gridlines */}
          {[20, 60, 100, 140, 180].map((y) => (
            <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#f1f5f3" strokeDasharray="6 8" strokeWidth="1" />
          ))}
          {/* Curve area */}
          <path d="M0 150 C80 120 115 110 170 90 C245 65 255 35 320 45 C390 55 395 140 458 130 C520 120 545 95 610 88 C660 82 690 70 720 65 L720 200 L0 200 Z" fill="url(#areaFill)" />
          {/* Curve line */}
          <path className="chart-line" d="M0 150 C80 120 115 110 170 90 C245 65 255 35 320 45 C390 55 395 140 458 130 C520 120 545 95 610 88 C660 82 690 70 720 65" fill="none" stroke="#0D9F8C" strokeWidth="3" strokeLinecap="round" style={{ filter: "url(#glow)" }} />
          {/* Data points */}
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

export function ReportsPage() {
  return (
    <div>
      <PageHeader eyebrow="Reports" title="Downloadable reports" description="Export agreement, billing and document usage reports for internal reviews." />
      <div className="grid gap-5 md:grid-cols-3">
        {["Agreement performance", "Billing summary", "Document usage", "Signature audit", "Team productivity", "Matter type revenue"].map((report) => (
          <Card key={report} className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(8,27,46,0.04)] hover:border-slate-350/50">
            <CardContent className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-5 shadow-sm">
                <Download className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">{report}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-medium">Export as PDF or CSV for leadership and compliance review.</p>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold hover:bg-slate-50">PDF</Button>
                <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold hover:bg-slate-50">CSV</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
