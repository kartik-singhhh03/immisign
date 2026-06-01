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

const agreements = [
  { id: "AGR-1048", client: "Harpreet Kaur", matter: "Partner Visa - SC 820", fee: "$3,500", status: "Signed", date: "19 May 2026" },
  { id: "AGR-1047", client: "Gurpreet Singh", matter: "Skilled Migration - SC 190", fee: "$2,200", status: "Awaiting", date: "21 May 2026" },
  { id: "AGR-1046", client: "Maninder Gill", matter: "Aged Dependent Relative - SC 838", fee: "$4,800", status: "Sent", date: "22 May 2026" },
  { id: "AGR-1045", client: "Davinder Kaur", matter: "Student Visa - SC 500", fee: "$1,100", status: "Draft", date: "22 May 2026" },
]

const clients = [
  { name: "Harpreet Kaur", email: "harpreet@example.com", matters: 3, stage: "Active", value: "$8,700" },
  { name: "Gurpreet Singh", email: "gurpreet@example.com", matters: 2, stage: "Awaiting signature", value: "$4,200" },
  { name: "Maninder Gill", email: "maninder@example.com", matters: 1, stage: "Document review", value: "$4,800" },
  { name: "Davinder Kaur", email: "davinder@example.com", matters: 2, stage: "Drafting", value: "$2,600" },
]

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

export function BillingPage() {
  const { activeWorkspace, user } = useAuthStore()
  const currentWorkspace = activeWorkspace || {
    name: "AVC Migration Partners",
    slug: "avc-migration",
    team: [{ name: "Rajwant Singh" }]
  }
  const currentRole = user?.role || "Owner"
  const isBillingRestricted = currentRole === "Assistant" || currentRole === "Read-only staff" || currentRole === "Migration Agent"

  // Modal Upgrade State
  const [isUpgradeOpen, setIsUpgradeOpen] = React.useState(false)
  const [upgradingPlan, setUpgradingPlan] = React.useState(false)
  const [upgradeSuccess, setUpgradeSuccess] = React.useState(false)
  const [newSeatCount, setNewSeatCount] = React.useState(5)

  // Global Float Toast State
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSeatUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpgradingPlan(true)
    
    // Simulate real quick logic
    setUpgradingPlan(false)
    setUpgradeSuccess(true)
    setIsUpgradeOpen(false)
    setUpgradeSuccess(false)
    triggerToast(`Billing capacity expanded to ${newSeatCount} seats successfully!`)
  }

  // Pre-calculated stats
  const activeSeats = currentWorkspace.team ? currentWorkspace.team.length : 3
  const totalPaidSeats = 5 // Limit in billing
  const seatUsagePercent = Math.round((activeSeats / totalPaidSeats) * 100)

  const documentUsage = 185
  const documentLimit = 500
  const docUsagePercent = Math.round((documentUsage / documentLimit) * 100)

  const agreementVolume = 32
  const agreementLimit = 50
  const agreementPercent = Math.round((agreementVolume / agreementLimit) * 100)

  return (
    <div className="relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#081B2E] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-4 w-4 text-[#0D9F8C]" />
          {toastMessage}
        </div>
      )}

      {/* Upgrade Seats Dialog */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Expand Workspace Seats</DialogTitle>
          </DialogHeader>
          
          {upgradeSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm animate-bounce">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-[#081B2E]">Licenses Provisioned Successfully!</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">Your card ending in 4242 has been billed. Seats are immediately available in the Team Setup settings.</p>
            </div>
          ) : (
            <form onSubmit={handleSeatUpgrade} className="space-y-5 mt-3">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs leading-relaxed text-slate-500 font-medium">
                Adding additional practitioner licenses will increase your monthly Stripe subscription by <span className="font-bold text-[#0D9F8C]">$29/seat</span> (prorated for the active billing cycle).
              </div>
              
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                New Target Team Seats
                <div className="flex items-center gap-3">
                  <Input 
                    type="number"
                    min={activeSeats}
                    max={50}
                    value={newSeatCount} 
                    onChange={(e) => setNewSeatCount(Number(e.target.value))} 
                    className="h-11 rounded-xl border-slate-200 bg-white text-base font-bold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
                  />
                  <span className="text-xs text-slate-400 font-bold shrink-0">Currently paid: {totalPaidSeats} seats</span>
                </div>
              </label>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-bold">New Monthly Total</span>
                  <span className="text-base font-black text-[#081B2E]">${129 + (newSeatCount - 5) * 29}/mo</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsUpgradeOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
                  <Button type="submit" disabled={upgradingPlan} className="rounded-xl h-11 text-xs font-bold bg-[#0D9F8C] hover:bg-[#0A5B52]">
                    {upgradingPlan ? "Processing..." : "Confirm & Charge"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <PageHeader eyebrow="Billing" title="Plan, usage and invoices" description="Stripe-inspired billing controls for current plan, payment methods, invoices and upgrade flows."  action={<div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm"><ShieldAlert className="h-4 w-4" /> Demo Data Mode</div>} />
      
      {/* Role Restriction Banner */}
      {isBillingRestricted && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-center gap-3 text-xs text-amber-800 font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Restricted Billing Access:</span> Your active simulated role is <span className="font-bold underline">{currentRole}</span>. Billing updates, invoices, and Stripe seat provisions are restricted to <span className="font-bold">Owner</span> or <span className="font-bold">Admin</span> users.
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        {/* Stripe Subscription details card */}
        <Card className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/5 via-white to-emerald-50/10 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7 flex flex-col justify-between h-full min-h-[300px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-[#0D9F8C] tracking-wider">Active Workspace Plan</span>
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#081B2E]">Pro Enterprise</h2>
                <p className="mt-2 text-sm text-slate-500 font-semibold max-w-md leading-relaxed">
                  $129/month base + $29/additional agent seat. Custom legal clause libraries, automated OMARA compliance checks, and secure Sydney servers enabled.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-3">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Payment Method</span>
                  <div className="mt-1 flex items-center gap-2 font-bold text-[#081B2E]">
                    <span className="bg-slate-100 rounded px-1.5 py-0.5 text-xs font-mono">VISA</span>
                    •••• •••• •••• 4242 (Expires 12/28)
                  </div>
                </div>
                {!isBillingRestricted && (
                  <Button 
                    onClick={() => triggerToast("Stripe Customer Billing Portal opened in new tab (Simulated).")}
                    variant="outline" 
                    className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-bold hover:bg-slate-50"
                  >
                    Update Card
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {!isBillingRestricted ? (
                  <>
                    <Button 
                      onClick={() => setIsUpgradeOpen(true)}
                      className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_8px_20px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52] h-10.5 px-5 text-xs text-white"
                    >
                      Expand Seat Licenses
                    </Button>
                    <Button 
                      onClick={() => triggerToast("Upgrade request sent to ImmiSign account representative.")}
                      variant="outline"
                      className="rounded-xl border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 h-10.5 px-5 text-xs"
                    >
                      Request High-Volume Enterprise Plan
                    </Button>
                  </>
                ) : (
                  <Button 
                    disabled
                    className="rounded-xl bg-slate-100 text-slate-400 font-bold h-10.5 px-5 text-xs border border-slate-200/50 cursor-not-allowed"
                  >
                    Locked by Administrator
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live seat and usage meter card */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7 space-y-6">
            <h2 className="text-base font-bold tracking-tight text-[#081B2E] border-b border-slate-100 pb-3">Workspace Usage Metrics</h2>
            
            {/* Seat Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" /> Active Team Seats
                </span>
                <span className="font-mono text-[#081B2E]">{activeSeats} / {totalPaidSeats} occupied</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#0D9F8C] transition-all duration-500" 
                  style={{ width: `${seatUsagePercent}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>{totalPaidSeats - activeSeats} unused seats remaining</span>
                <span>{seatUsagePercent}%</span>
              </div>
            </div>

            {/* Document Assembly Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400" /> Secure Documents
                </span>
                <span className="font-mono text-[#081B2E]">{documentUsage} / {documentLimit} assembled</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#0D9F8C] transition-all duration-500" 
                  style={{ width: `${docUsagePercent}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>Resets monthly on next invoice date</span>
                <span>{docUsagePercent}%</span>
              </div>
            </div>

            {/* Agreement signature volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" /> Active Agreements
                </span>
                <span className="font-mono text-[#081B2E]">{agreementVolume} / {agreementLimit} signatures</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#0D9F8C] transition-all duration-500" 
                  style={{ width: `${agreementPercent}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>Limits capacity to 50 active negotiations</span>
                <span>{agreementPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Invoices logs */}
      <div className="mt-6 rounded-2xl border border-slate-200/50 bg-white/60 overflow-hidden shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] divide-y divide-slate-150">
        <div className="p-5 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Past Invoices Audit Trail</h3>
        </div>
        {[
          { code: "INV-1048", amount: "$129.00", status: "Paid", date: "May 15, 2026" },
          { code: "INV-1047", amount: "$129.00", status: "Paid", date: "Apr 15, 2026" },
          { code: "INV-1046", amount: "$158.00", status: "Paid", date: "Mar 15, 2026 (Includes 1 extra seat)" },
        ].map((invoice) => (
          <div key={invoice.code} className="flex items-center justify-between p-4.5 hover:bg-slate-50/40 transition-colors text-xs font-semibold">
            <div>
              <span className="font-bold text-sm text-[#081B2E]">{invoice.code}</span>
              <span className="text-slate-400 font-medium ml-2">• {invoice.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-700">{invoice.amount}</span>
              <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{invoice.status}</span>
              <Button 
                onClick={() => triggerToast(`Downloading copy of ${invoice.code} in PDF format.`)}
                variant="outline" 
                className="h-8.5 rounded-lg border-slate-200 bg-white px-3 text-[11px] font-bold hover:bg-slate-50"
              >
                Download PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
