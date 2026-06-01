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

export function NewAgreementPage() {
  const currentSlug = useAuthStore(s => s.activeWorkspace?.slug || "avc-migration")
  const steps = ["Client", "Matter", "Fees", "Terms", "Preview", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState("Just now")
  const [dispatched, setDispatched] = React.useState(false)

  const handleDispatch = async () => {
    setSaving(true)
    try {
      const activeWorkspace = useAuthStore.getState().activeWorkspace;
      const user = useAuthStore.getState().user;
      
      if (!activeWorkspace || !user) {
        throw new Error("No active workspace or user session");
      }

      const res = await fetch('/api/agreements/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          agencyId: activeWorkspace.id,
          userId: user.id
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to dispatch standard agreement");
      }

      setDispatched(true);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send agreement: " + err.message);
    } finally {
      setSaving(false);
    }
  }
  
  const [formData, setFormData] = React.useState({
    // Step 1: Client
    clientName: "Gurpreet Singh",
    clientEmail: "gurpreet.singh@gmail.com",
    clientPhone: "+61 402 984 102",
    sponsorName: "Amandeep Kaur",
    responsibleRma: "Rajwant Singh (MARN 1794016)",
    
    // Step 2: Matter
    visaSubclass: "SC 820 - Partner Visa (Onshore)",
    matterPriority: "High",
    lodgementDeadline: "2026-10-15",
    scopeOfWork: "Comprehensive onshore Partner Visa representation. Formulates standard matter timelines, reviews sponsor credentials, compiles evidentiary index, conducts OMARA compliant pre-lodgement checks, and manages all subsequent DHA inquiries.",
    
    // Step 3: Fees
    professionalFee: "4500",
    depositRequired: "1500",
    billingFrequency: "Milestone instalments (50/50 split)",
    gstRequired: "Yes",
    
    // Step 4: Terms
    termsTemplate: "Standard OMARA Compliant Service Agreement",
    governingLaw: "New South Wales (NSW)",
    additionalClauses: "CLAUSE-OMARA-MANDATE: consumer protection guide delivered. CLAUSE-REFUND-DISCLAIMER: lodgement fees are non-refundable.",
    customNotes: "Client requires express translation assistance for native language birth certificates from Punjab.",
  })

  // Simulated live autosave whenever formData changes
  React.useEffect(() => {
    setSaving(true)
    const timer = setTimeout(() => {
      setSaving(false)
      const now = new Date()
      setLastSaved(`Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
    }, 700)
    return () => clearTimeout(timer)
  }, [formData])

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculatedTax = formData.gstRequired === "Yes" ? parseFloat(formData.professionalFee || "0") * 0.10 : 0
  const totalAmount = parseFloat(formData.professionalFee || "0") + calculatedTax

  const renderClientStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Client Name (Large Clean Input)
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.clientName} 
            onChange={(e) => handleFieldChange("clientName", e.target.value)}
            placeholder="e.g. Gurpreet Singh" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Email Address
          <Input 
            type="email"
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.clientEmail} 
            onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
            placeholder="e.g. gurpreet.singh@gmail.com" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Phone Number
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.clientPhone} 
            onChange={(e) => handleFieldChange("clientPhone", e.target.value)}
            placeholder="e.g. +61 402 984 102" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Sponsor Full Name (if applicable)
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.sponsorName} 
            onChange={(e) => handleFieldChange("sponsorName", e.target.value)}
            placeholder="e.g. Amandeep Kaur" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Responsible Migration Agent (Practitioner)
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.responsibleRma}
            onChange={(e) => handleFieldChange("responsibleRma", e.target.value)}
          >
            <option value="Rajwant Singh (MARN 1794016)">Rajwant Singh (MARN 1794016)</option>
            <option value="Priya Mehta (MARN 2189402)">Priya Mehta (MARN 2189402)</option>
            <option value="Unassigned">Leave Unassigned</option>
          </select>
        </label>
      </div>
      <div className="mt-7 flex justify-end">
        <Button onClick={() => setCurrentStep(1)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Continue to Matter Details <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderMatterStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Visa Subclass
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.visaSubclass}
            onChange={(e) => handleFieldChange("visaSubclass", e.target.value)}
          >
            <option value="SC 820 - Partner Visa (Onshore)">SC 820 - Partner Visa (Onshore)</option>
            <option value="SC 189 - Skilled Independent">SC 189 - Skilled Independent</option>
            <option value="SC 190 - Skilled Nominated">SC 190 - Skilled Nominated</option>
            <option value="SC 482 - Temporary Skill Shortage">SC 482 - Temporary Skill Shortage</option>
            <option value="SC 143 - Contributory Parent">SC 143 - Contributory Parent</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Matter Priority Level
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.matterPriority}
            onChange={(e) => handleFieldChange("matterPriority", e.target.value)}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority (Urgent)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Target Lodgement Deadline
          <Input 
            type="date"
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.lodgementDeadline} 
            onChange={(e) => handleFieldChange("lodgementDeadline", e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Compliant Scope of Work
          <textarea 
            className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.scopeOfWork}
            onChange={(e) => handleFieldChange("scopeOfWork", e.target.value)}
            placeholder="Describe the exact scope of services to be provided..."
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(2)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Continue to Fees <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderFeesStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Professional Fee Amount (AUD)
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <Input 
              type="number"
              className="h-12 rounded-xl border-slate-200 bg-white pl-8 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
              value={formData.professionalFee} 
              onChange={(e) => handleFieldChange("professionalFee", e.target.value)}
              placeholder="e.g. 4500" 
            />
          </div>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Upfront Deposit / Retainer (AUD)
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <Input 
              type="number"
              className="h-12 rounded-xl border-slate-200 bg-white pl-8 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
              value={formData.depositRequired} 
              onChange={(e) => handleFieldChange("depositRequired", e.target.value)}
              placeholder="e.g. 1500" 
            />
          </div>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Billing Frequency / Split
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.billingFrequency}
            onChange={(e) => handleFieldChange("billingFrequency", e.target.value)}
          >
            <option value="Milestone instalments (50/50 split)">Milestone instalments (50/50 split)</option>
            <option value="Three-tier retainer schedule">Three-tier retainer schedule</option>
            <option value="100% upfront professional payment">100% upfront professional payment</option>
            <option value="Hourly rate model">Hourly rate model ($350/hr)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Apply Australian GST (10%)
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.gstRequired}
            onChange={(e) => handleFieldChange("gstRequired", e.target.value)}
          >
            <option value="Yes">Yes (10% GST Added)</option>
            <option value="No">No (GST Exempt - Offshore client)</option>
          </select>
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(3)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Continue to Terms <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderTermsStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Service Agreement Legal Template
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.termsTemplate}
            onChange={(e) => handleFieldChange("termsTemplate", e.target.value)}
          >
            <option value="Standard OMARA Compliant Service Agreement">Standard OMARA Compliant Service Agreement (Version 2.4)</option>
            <option value="Short-Form Visa Retainer">Short-Form Visa Retainer (Employer Sponsor Specific)</option>
            <option value="AAT Appeals Service Mandate">AAT Appeals Service Mandate</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Governing State Law
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.governingLaw}
            onChange={(e) => handleFieldChange("governingLaw", e.target.value)}
          >
            <option value="New South Wales (NSW)">New South Wales (NSW)</option>
            <option value="Victoria (VIC)">Victoria (VIC)</option>
            <option value="Queensland (QLD)">Queensland (QLD)</option>
            <option value="Western Australia (WA)">Western Australia (WA)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Additional Clause Codes
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.additionalClauses} 
            onChange={(e) => handleFieldChange("additionalClauses", e.target.value)}
            placeholder="Clause identifiers..." 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Practitioner Custom Notes
          <textarea 
            className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.customNotes}
            onChange={(e) => handleFieldChange("customNotes", e.target.value)}
            placeholder="Any extra instructions, native translation notes or milestones exceptions..."
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(4)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Generate Preview <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Dynamic Paper Style Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md font-sans max-w-full overflow-hidden text-xs text-[#081B2E] space-y-6 relative">
        <div className="absolute right-6 top-6 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C] border border-emerald-100">
          DRAFT PREVIEW
        </div>

        {/* Header logo / details */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <div className="text-sm font-black text-[#081b36] tracking-tight">ImmiSign Legal-Tech Document</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Ref: {formData.visaSubclass.split(" ")[1]}-AGR-PRO</div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Governing Law</span>
            <div className="text-[11px] font-bold text-[#0D9F8C] mt-0.5">{formData.governingLaw}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registered Migration Agent (RMA)</div>
            <div className="mt-2 font-bold text-sm text-[#081b36]">{formData.responsibleRma.split(" (")[0]}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{formData.responsibleRma.includes("MARN") ? "OMARA MARN: " + formData.responsibleRma.split("MARN ")[1].split(")")[0] : "RMA Registered"}</div>
            <div className="text-xs text-slate-400 mt-0.5">Sydney Office HQ, NSW</div>
          </div>
          <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Client Signatory</div>
            <div className="mt-2 font-bold text-sm text-[#081b36]">{formData.clientName || "(No Name Provided)"}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{formData.clientEmail || "client@email.com"}</div>
            <div className="text-xs text-slate-400 mt-0.5">{formData.clientPhone || "+61 400 000 000"}</div>
          </div>
        </div>

        {/* Matter Scope */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">1. Scope of Registered Services</h4>
          <p className="leading-relaxed font-semibold text-slate-600">
            The Agent will prepare, compile, index, and lodge a valid visa application for subclass <strong className="text-[#081b36]">{formData.visaSubclass}</strong> on behalf of <strong className="text-[#081b36]">{formData.clientName}</strong>. 
            {formData.sponsorName && <> Sponsor support is acknowledged for <strong>{formData.sponsorName}</strong>.</>}
          </p>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-slate-500 leading-relaxed font-medium italic border border-slate-100/50">
            &ldquo;{formData.scopeOfWork || "No custom scope details structured."}&rdquo;
          </div>
        </div>

        {/* Fees */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">2. Professional Fees & Milestone Payments</h4>
          <div className="rounded-xl border border-slate-150 overflow-hidden divide-y divide-slate-150 font-semibold">
            <div className="flex justify-between p-3 bg-slate-50/50">
              <span className="text-slate-500">Base Professional Fee</span>
              <span className="text-[#081B2E]">${parseFloat(formData.professionalFee || "0").toLocaleString()} AUD</span>
            </div>
            {formData.gstRequired === "Yes" && (
              <div className="flex justify-between p-3">
                <span className="text-slate-500">Australian GST (10%)</span>
                <span className="text-[#081B2E]">${calculatedTax.toLocaleString()} AUD</span>
              </div>
            )}
            <div className="flex justify-between p-3 bg-[#f7fffd]">
              <span className="text-[#0D9F8C] font-black">Total Fee Due</span>
              <span className="text-[#0D9F8C] font-black text-sm">${totalAmount.toLocaleString()} AUD</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Upfront Retainer Deposit Required</span>
              <span className="text-[#081B2E] font-bold">${parseFloat(formData.depositRequired || "0").toLocaleString()} AUD</span>
            </div>
          </div>
          <p className="mt-3 leading-relaxed text-slate-500 font-semibold text-xs">
            Billing Frequency: <strong className="text-[#081b36]">{formData.billingFrequency}</strong>. Retainers are securely deposited to a client trust account in compliance with OMARA guidelines.
          </p>
        </div>

        {/* Regulatory terms */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">3. Standard OMARA Terms & Code of Conduct</h4>
          <p className="leading-relaxed text-slate-500 font-semibold">
            This agreement is bound by the Australian Migration Agents Code of Conduct (OMARA). The consumer guide will be provided to the client. Governing Jurisdiction remains inside <strong className="text-[#081b36]">{formData.governingLaw}</strong>.
          </p>
          {formData.customNotes && (
            <div className="mt-3 p-3 border-l-2 border-[#0D9F8C] bg-slate-50 text-xs font-semibold text-slate-600">
              <span className="font-bold block text-slate-800 text-[9px] uppercase tracking-wider mb-1">Practitioner Note:</span>
              {formData.customNotes}
            </div>
          )}
        </div>
      </div>

      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(3)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(5)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Proceed to Dispatches <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderSendStep = () => (
    <div className="space-y-6">
      {dispatched ? (
        <Card className="rounded-2xl border border-emerald-100 bg-[#f8fffd]/80 p-8 text-center shadow-[0_12px_40px_rgba(13,159,140,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-6 animate-pulse">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-[#081b36]">Agreement Dispatched!</h2>
          <p className="mt-3 text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            The OMARA compliant service agreement for subclass <strong className="text-[#081b36]">{formData.visaSubclass.split(" - ")[0]}</strong> has been securely hashed, digitally signed by {formData.responsibleRma.split(" (")[0]}, and dispatched to <strong className="text-[#081b36]">{formData.clientEmail}</strong>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-slate-100 border border-slate-200/50 px-3.5 py-1 text-xs font-bold text-slate-500 font-mono">HASH: SHA-256#820- Singh-Kaur</span>
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1 text-xs font-bold text-[#0D9F8C]">Audit Locked</span>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-bold">
              <Link href={`/workspace/${currentSlug}/agreements`}>View Agreements List</Link>
            </Button>
            <Button onClick={() => setDispatched(false)} className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
              Create Another Agreement
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#081B2E]">Dispatch Controls</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Select delivery paths and secure verification configurations to dispatch this agreement.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/50 bg-white p-5 space-y-4">
              <div className="font-bold text-sm text-[#081B2E]">Agreement Signers</div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-[#0D9F8C]">RMA</span>
                    <span className="text-xs font-bold text-slate-700">{formData.responsibleRma.split(" (")[0]}</span>
                  </div>
                  <span className="text-xs font-black text-[#0D9F8C] bg-emerald-100/50 px-2 py-0.5 rounded">RMA SIGNED</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-xs font-black text-amber-700">CLI</span>
                    <span className="text-xs font-bold text-slate-700">{formData.clientName || "Client"}</span>
                  </div>
                  <span className="text-xs font-black text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded">AWAITING</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/50 bg-white p-5 space-y-4">
              <div className="font-bold text-sm text-[#081B2E]">Audit Trail Channels</div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded border-slate-350 text-[#0D9F8C] focus:ring-[#0D9F8C] h-4 w-4" />
                    <span className="text-xs font-bold text-slate-700">Email Delivery ({formData.clientEmail || "Not Set"})</span>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded border-slate-350 text-[#0D9F8C] focus:ring-[#0D9F8C] h-4 w-4" />
                    <span className="text-xs font-bold text-slate-700">SMS Verification Link ({formData.clientPhone || "Not Set"})</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(4)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
              Back to Preview
            </Button>
            <Button onClick={handleDispatch} className="rounded-xl bg-[#0D9F8C] font-bold px-8 shadow-md hover:bg-[#0A5B52]">
              Authorise & Dispatch Agreement <Send className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return renderClientStep()
      case 1:
        return renderMatterStep()
      case 2:
        return renderFeesStep()
      case 3:
        return renderTermsStep()
      case 4:
        return renderPreviewStep()
      case 5:
      default:
        return renderSendStep()
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="New agreement"
        title="Create a compliant agreement"
        description="A guided workflow with autosave, preview and a sticky matter summary."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Wizard Steps Container */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep
                const isActive = index === currentStep
                return (
                  <button
                    key={step}
                    disabled={dispatched}
                    onClick={() => {
                      if (index < currentStep || index === currentStep) {
                        setCurrentStep(index)
                      }
                    }}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-300",
                      isActive 
                        ? "border-[#0D9F8C]/30 bg-emerald-50/20 text-[#081B2E] shadow-sm font-bold" 
                        : isCompleted 
                          ? "border-emerald-100 bg-white text-[#0D9F8C]" 
                          : "border-slate-100 bg-white/40 text-slate-400"
                    )}
                  >
                    <div 
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black transition-all duration-300",
                        isActive 
                          ? "bg-[#0D9F8C] text-white shadow-[0_8px_20px_rgba(13,159,140,0.22)]" 
                          : isCompleted 
                            ? "bg-emerald-50 text-[#0D9F8C] border border-emerald-100" 
                            : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <div className={cn("mt-3 text-[11px] transition-all font-semibold", isActive ? "text-[#0A5B52] font-bold" : "text-slate-500")}>
                      {step}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <CardContent className="p-7">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">{steps[currentStep]} Details</h2>
                <div className="flex items-center gap-2">
                  {saving ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#0D9F8C] bg-emerald-50/50 px-3 py-1 rounded-full border border-emerald-100/30">
                      <svg className="animate-spin h-3.5 w-3.5 text-[#0D9F8C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Autosaving...
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#0D9F8C] border border-emerald-100/50">
                      {lastSaved}
                    </span>
                  )}
                </div>
              </div>
              
              {renderContent()}
            </CardContent>
          </Card>
        </div>

        {/* Sticky Summary Column */}
        <div className="relative">
          <Card className="sticky top-24 h-fit rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">Agreement summary</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Live status of current matter draft.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Client</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.clientName || "Not Selected"}</div>
                  <div className="text-xs text-slate-500 font-semibold">{formData.clientEmail || "Email unassigned"}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Matter & Scope</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.visaSubclass.split(" - ")[0]}</div>
                  <div className="text-xs text-slate-500 font-semibold">Priority: {formData.matterPriority}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Legal Fees & Split</span>
                  <div className="font-bold text-[#0D9F8C] text-sm">${totalAmount.toLocaleString()} AUD</div>
                  <div className="text-xs text-slate-500 font-semibold">Retainer due: ${parseFloat(formData.depositRequired || "0").toLocaleString()} AUD</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Regulatory Terms</span>
                  <div className="font-bold text-slate-600 truncate text-[11px]">{formData.termsTemplate}</div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">Jurisdiction: {formData.governingLaw.split(" (")[0]}</div>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0D9F8C]"></span>
                  Draft Autosaved
                </span>
                <span>Active Step: {currentStep + 1}/6</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
