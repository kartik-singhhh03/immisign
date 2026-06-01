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

export function DashboardHomePage() {
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)
  const currentId = activeWorkspace?.id || "w-avc"
  const currentSlug = activeWorkspace?.slug || "avc-migration"
  
  const { approvals, fetchApprovals } = useApprovalStore()

  React.useEffect(() => {
    fetchApprovals(currentId)
  }, [currentId, fetchApprovals])

  const pendingApprovals = approvals.filter(a => a.status === 'under_review' || a.status === 'sent_to_client' || a.status === 'partially_reviewed' || a.status === 'changes_requested')

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Practice command centre"
        title="Good day, Rajwant"
        description="A calm overview of agreements, signatures, documents and team activity across the practice."
        action={<Button className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]"><Plus className="h-4 w-4" />New Agreement</Button>}
      />
      <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive pulse</div>
          <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900">18 agreements moved forward this week with no overdue signature packets.</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {["Zero overdue", "4 drafts ready", "2 clients need follow-up"].map((item) => (
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
              <h2 className="mt-3 text-lg font-bold text-slate-900 tracking-tight">Review awaiting signatures</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C]">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500 font-medium">Two high-value matters have been opened but not signed. Send a polite reminder before end of day.</p>
          <Button variant="outline" className="mt-6 h-10 w-full rounded-xl bg-white font-semibold border-slate-200 shadow-sm text-slate-700">Open queue</Button>
        </div>
      </div>
      <div className="stagger-children grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total sent" value="24" change="+12%" icon={FileText} />
        <MetricCard label="Awaiting" value="12" change="+5%" icon={Clock3} />
        <MetricCard label="Signed" value="18" change="+26%" icon={CheckCircle2} />
        <MetricCard label="This month" value="$42k" change="+18%" icon={BarChart3} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <MiniChart />
        </div>
        <Card className="rounded-[1.35rem] border-white/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Notifications</h2>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">4 new</span>
            </div>
            <div className="mt-5 space-y-4">
              {["Harpreet signed Partner Visa agreement", "Gurpreet opened fee schedule", "Invoice INV-048 was paid", "Template update ready for review"].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white">
                  <Bell className="mt-0.5 h-4 w-4 text-[#0D9F8C]" />
                  <div>
                    <p className="text-sm font-bold">{item}</p>
                    <p className="mt-1 text-xs text-slate-500">{index + 1}h ago</p>
                  </div>
                </div>
              ))}
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
              {pendingApprovals.slice(0, 5).map((approval) => (
                <Link
                  key={approval.id}
                  href={`/workspace/${currentSlug}/application-approvals/${approval.id}`}
                  className="group grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{approval.clientName}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{approval.visaSubclass}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">{approval.agentName}</div>
                  <div>
                    <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/90 text-amber-700 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
                      {approval.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-400">
                    {approval.lodgementDeadline ? new Date(approval.lodgementDeadline).toLocaleDateString() : 'N/A'}
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
              {[
                { label: "Create agreement", icon: FileSignature, href: `/workspace/${currentSlug}/agreements/new` },
                { label: "New Application Review", icon: FileCheck2, href: `/workspace/${currentSlug}/application-approvals` },
                { label: "Send document", icon: Send, href: "#" },
                { label: "Upload template", icon: UploadCloud, href: "#" },
              ].map((action) => (
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

export function AgreementsPage() {
  const mockAgreementsList = [
    { id: "AGR-1048", client: "Harpreet Kaur", email: "harpreet@example.com", matter: "Partner Visa - SC 820", fee: "$3,500", status: "Signed", date: "19 May 2026", scope: "Onshore Partner Visa (820/801) compile, check and lodge.", law: "New South Wales (NSW)" },
    { id: "AGR-1047", client: "Gurpreet Singh", email: "gurpreet@example.com", matter: "Skilled Migration - SC 190", fee: "$2,200", status: "Awaiting", date: "21 May 2026", scope: "State nomination Skilled visa representation.", law: "Victoria (VIC)" },
    { id: "AGR-1046", client: "Maninder Gill", email: "maninder@example.com", matter: "Aged Dependent - SC 838", fee: "$4,800", status: "Sent", date: "22 May 2026", scope: "Aged Dependent Relative visa onshore lodgement.", law: "Queensland (QLD)" },
    { id: "AGR-1045", client: "Davinder Kaur", email: "davinder@example.com", matter: "Student Visa - SC 500", fee: "$1,100", status: "Draft", date: "22 May 2026", scope: "Student visa SC 500 extension and GTE compilation.", law: "New South Wales (NSW)" },
    { id: "AGR-1044", client: "Amanpreet Cheema", email: "aman@example.com", matter: "Employer Sponsored - SC 482", fee: "$3,900", status: "Signed", date: "14 May 2026", scope: "TSS 482 visa nomination and application representation.", law: "Western Australia (WA)" },
    { id: "AGR-1043", client: "Rajinder Sodhi", email: "rajinder@example.com", matter: "Parent Visa - SC 143", fee: "$5,500", status: "Expired", date: "10 May 2026", scope: "Contributory Parent visa SC 143 case assembly.", law: "New South Wales (NSW)" },
    { id: "AGR-1042", client: "Sandeep Dhillon", email: "sandeep@example.com", matter: "Visitor Visa - SC 600", fee: "$850", status: "Signed", date: "08 May 2026", scope: "Visitor visa tourist stream application.", law: "Victoria (VIC)" },
    { id: "AGR-1041", client: "Baldev Singh", email: "baldev@example.com", matter: "Citizenship Application", fee: "$1,200", status: "Sent", date: "05 May 2026", scope: "Australian Citizenship application and test prep.", law: "Queensland (QLD)" },
    { id: "AGR-1040", client: "Jasmin Sidhu", email: "jasmin@example.com", matter: "Student Visa - SC 500", fee: "$1,150", status: "Draft", date: "02 May 2026", scope: "Higher education SC 500 visa filing.", law: "Victoria (VIC)" },
    { id: "AGR-1039", client: "Karan Johar", email: "karan@example.com", matter: "Partner Visa - SC 309", fee: "$4,200", status: "Awaiting", date: "28 Apr 2026", scope: "Offshore partner visa (309/100) lodgement.", law: "New South Wales (NSW)" },
    { id: "AGR-1038", client: "Navjot Sidhu", email: "navjot@example.com", matter: "Skilled Independent - SC 189", fee: "$2,900", status: "Signed", date: "25 Apr 2026", scope: "Skilled independent SC 189 points test lodgement.", law: "Western Australia (WA)" },
  ]

  interface Agreement {
    id: string
    client: string
    email: string
    matter: string
    fee: string
    status: string
    date: string
    scope: string
    law: string
  }

  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("All")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [previewAgreement, setPreviewAgreement] = React.useState<Agreement | null>(null)
  
  const itemsPerPage = 5

  const filteredAgreements = mockAgreementsList.filter((agreement) => {
    const matchesSearch = 
      agreement.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.matter.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = activeFilter === "All" || agreement.status.toLowerCase() === activeFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })

  const totalItems = filteredAgreements.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAgreements = filteredAgreements.slice(startIndex, startIndex + itemsPerPage)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const getStats = (status: string) => {
    return mockAgreementsList.filter(a => a.status.toLowerCase() === status.toLowerCase()).length
  }

  const statPercentages = {
    Draft: (getStats("Draft") / mockAgreementsList.length) * 100,
    Sent: (getStats("Sent") / mockAgreementsList.length) * 100,
    Awaiting: (getStats("Awaiting") / mockAgreementsList.length) * 100,
    Signed: (getStats("Signed") / mockAgreementsList.length) * 100,
    Expired: (getStats("Expired") / mockAgreementsList.length) * 100,
  }

  return (
    <div className="animate-enter space-y-8">
      <PageHeader
        eyebrow="Agreements"
        title="Agreement workspace"
        description="Track every draft, sent agreement, pending signature and signed record from one premium table."
        action={
          <Button asChild className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]">
            <Link href="/agreements/new">
              <Plus className="h-4 w-4 mr-1.5" /> New Agreement
            </Link>
          </Button>
        }
      />

      {/* Grid Stats Header */}
      <div className="stagger-children grid gap-4 grid-cols-2 md:grid-cols-5">
        {["Draft", "Sent", "Awaiting", "Signed", "Expired"].map((status) => {
          const count = getStats(status)
          const pct = statPercentages[status as keyof typeof statPercentages]
          return (
            <Card key={status} className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{status}</div>
                  <span className="h-2 w-2 rounded-full bg-[#0D9F8C] shadow-[0_0_12px_rgba(13,159,140,0.6)]" />
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight text-[#081B2E]">{count}</div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="chart-bar h-full rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]" style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search agreements by client name, matter description or ID..." 
            className="h-12 rounded-xl border-slate-200 bg-white pl-11 focus-visible:ring-1 focus-visible:ring-[#0D9F8C] placeholder:text-slate-400"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-2">
          {["All", "Draft", "Sent", "Awaiting", "Signed", "Expired"].map((filter) => {
            const count = filter === "All" 
              ? mockAgreementsList.length 
              : mockAgreementsList.filter(a => a.status.toLowerCase() === filter.toLowerCase()).length
            const isActive = activeFilter === filter
            return (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter)
                  setCurrentPage(1)
                }}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-300 flex items-center gap-2",
                  isActive 
                    ? "bg-[#0D9F8C] text-white shadow-[0_8px_20px_rgba(13,159,140,0.15)]" 
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60"
                )}
              >
                {filter}
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-black transition-all",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Table Head */}
        <div className="grid grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 max-lg:hidden">
          <div>Client</div>
          <div>Matter Description</div>
          <div>Professional Fee</div>
          <div>Signing Status</div>
          <div>Sent Date</div>
          <div />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {paginatedAgreements.length > 0 ? (
            paginatedAgreements.map((agreement) => (
              <div
                key={agreement.id}
                className="group grid gap-3 px-6 py-5 transition-all duration-200 hover:bg-slate-50/40 lg:grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] lg:items-center"
              >
                <div onClick={() => setPreviewAgreement(agreement)} className="cursor-pointer">
                  <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{agreement.client}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">{agreement.id} ΓÇó {agreement.email}</div>
                </div>
                <div onClick={() => setPreviewAgreement(agreement)} className="text-xs font-bold text-slate-600 cursor-pointer">{agreement.matter}</div>
                <div className="text-sm font-bold text-[#081B2E]">{agreement.fee}</div>
                <div>
                  <StatusPill status={agreement.status} />
                </div>
                <div className="text-xs font-semibold text-slate-500">{agreement.date}</div>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200/60 p-1.5 shadow-md">
                      <DropdownMenuItem onClick={() => setPreviewAgreement(agreement)} className="rounded-lg font-semibold text-xs cursor-pointer p-2 focus:bg-slate-50">
                        View Agreement Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg font-semibold text-xs cursor-pointer p-2 focus:bg-slate-50">
                        Send Email Reminder
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg font-semibold text-xs cursor-pointer p-2 focus:bg-slate-50">
                        Download Audit Hashing
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem className="rounded-lg font-semibold text-xs cursor-pointer p-2 text-red-600 focus:bg-red-50 focus:text-red-700">
                        Void Agreement
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-200">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#081B2E]">No agreements found</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Try modifying your search tags or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-250/20 pt-4 text-xs font-bold text-slate-500">
          <div>
            Showing <span className="text-[#081B2E]">{startIndex + 1}</span> to{" "}
            <span className="text-[#081B2E]">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
            <span className="text-[#081B2E]">{totalItems}</span> agreements
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Previews Modal */}
      <Dialog open={!!previewAgreement} onOpenChange={(open) => !open && setPreviewAgreement(null)}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 shadow-2xl p-7 rounded-2xl max-h-[85vh] overflow-y-auto">
          {previewAgreement && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                <DialogTitle className="text-lg font-black text-[#081B2E]">Agreement Digital Record</DialogTitle>
                <div className="text-xs text-slate-400 font-bold mt-1">ID: {previewAgreement.id} ΓÇó Registered Custody File</div>
              </DialogHeader>

              <div className="space-y-6 text-xs text-[#081B2E]">
                {/* Visual Status Indicator */}
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Signing Stage</span>
                    <div className="mt-1 font-bold text-sm text-[#081b36]">{previewAgreement.status === "Signed" ? "Fully Executed" : "Awaiting Client Seal"}</div>
                  </div>
                  <StatusPill status={previewAgreement.status} />
                </div>

                {/* Grid info */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="p-4 rounded-xl border border-slate-100 space-y-1 bg-white">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Client Signer</span>
                    <div className="font-bold text-sm text-slate-800">{previewAgreement.client}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{previewAgreement.email}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 space-y-1 bg-white">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Matter Description</span>
                    <div className="font-bold text-sm text-slate-800">{previewAgreement.matter.split(" - ")[0]}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">Subclass Code: {previewAgreement.matter.split(" - ")[1]}</div>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#0D9F8C] mb-2">1. Matter Scope of Representation</h4>
                  <p className="p-3 bg-slate-50/50 rounded-xl leading-relaxed text-slate-600 font-semibold border border-slate-100">
                    {previewAgreement.scope} All legal deliverables strictly adhere to the OMARA Migration Code of Conduct inside {previewAgreement.law}.
                  </p>
                </div>

                {/* Pricing summary */}
                <div>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#0D9F8C] mb-2">2. Compensation & Professional Fees</h4>
                  <div className="p-4 rounded-xl border border-slate-150 bg-white flex justify-between items-center font-bold">
                    <span className="text-slate-500 text-xs">Total Professional Fee</span>
                    <span className="text-[#0D9F8C] text-base">{previewAgreement.fee} AUD</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 font-semibold">Includes Governing Jurisdiction guidelines, retainer deposits, and Department lodgement disclaimers.</p>
                </div>

                {/* Audit Seals */}
                <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2 text-[10px] text-slate-400 font-semibold justify-between items-center">
                  <span>SHA-256 HASH RECORD LOCKED</span>
                  <span>Registered: {previewAgreement.date}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function NewAgreementPage() {
  const steps = ["Client", "Matter", "Fees", "Terms", "Preview", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState("Just now")
  const [dispatched, setDispatched] = React.useState(false)
  
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
        <div className="absolute right-6 top-6 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-[#0D9F8C] border border-emerald-100">
          DRAFT PREVIEW
        </div>

        {/* Header logo / details */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <div className="text-sm font-black text-[#081b36] tracking-tight">ImmiSign Legal-Tech Document</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">Ref: {formData.visaSubclass.split(" ")[1]}-AGR-PRO</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Governing Law</span>
            <div className="text-[11px] font-bold text-[#0D9F8C] mt-0.5">{formData.governingLaw}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registered Migration Agent (RMA)</div>
            <div className="mt-2 font-bold text-sm text-[#081b36]">{formData.responsibleRma.split(" (")[0]}</div>
            <div className="text-[10px] font-semibold text-slate-500 mt-1">{formData.responsibleRma.includes("MARN") ? "OMARA MARN: " + formData.responsibleRma.split("MARN ")[1].split(")")[0] : "RMA Registered"}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sydney Office HQ, NSW</div>
          </div>
          <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Client Signatory</div>
            <div className="mt-2 font-bold text-sm text-[#081b36]">{formData.clientName || "(No Name Provided)"}</div>
            <div className="text-[10px] font-semibold text-slate-500 mt-1">{formData.clientEmail || "client@email.com"}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{formData.clientPhone || "+61 400 000 000"}</div>
          </div>
        </div>

        {/* Matter Scope */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">1. Scope of Registered Services</h4>
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
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">2. Professional Fees & Milestone Payments</h4>
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
          <p className="mt-3 leading-relaxed text-slate-500 font-semibold text-[10px]">
            Billing Frequency: <strong className="text-[#081b36]">{formData.billingFrequency}</strong>. Retainers are securely deposited to a client trust account in compliance with OMARA guidelines.
          </p>
        </div>

        {/* Regulatory terms */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">3. Standard OMARA Terms & Code of Conduct</h4>
          <p className="leading-relaxed text-slate-500 font-semibold">
            This agreement is bound by the Australian Migration Agents Code of Conduct (OMARA). The consumer guide will be provided to the client. Governing Jurisdiction remains inside <strong className="text-[#081b36]">{formData.governingLaw}</strong>.
          </p>
          {formData.customNotes && (
            <div className="mt-3 p-3 border-l-2 border-[#0D9F8C] bg-slate-50 text-[10px] font-semibold text-slate-600">
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
              <Link href="/agreements">View Agreements List</Link>
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
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-black text-[#0D9F8C]">RMA</span>
                    <span className="text-xs font-bold text-slate-700">{formData.responsibleRma.split(" (")[0]}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#0D9F8C] bg-emerald-100/50 px-2 py-0.5 rounded">RMA SIGNED</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-[10px] font-black text-amber-700">CLI</span>
                    <span className="text-xs font-bold text-slate-700">{formData.clientName || "Client"}</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded">AWAITING</span>
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
            <Button onClick={() => setDispatched(true)} className="rounded-xl bg-[#0D9F8C] font-bold px-8 shadow-md hover:bg-[#0A5B52]">
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
                      {isCompleted ? "Γ£ô" : index + 1}
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
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Client</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.clientName || "Not Selected"}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{formData.clientEmail || "Email unassigned"}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Matter & Scope</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.visaSubclass.split(" - ")[0]}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Priority: {formData.matterPriority}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Legal Fees & Split</span>
                  <div className="font-bold text-[#0D9F8C] text-sm">${totalAmount.toLocaleString()} AUD</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Retainer due: ${parseFloat(formData.depositRequired || "0").toLocaleString()} AUD</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#F7FAF8] p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Regulatory Terms</span>
                  <div className="font-bold text-slate-600 truncate text-[11px]">{formData.termsTemplate}</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Jurisdiction: {formData.governingLaw.split(" (")[0]}</div>
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

export function AgreementDetailPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AGR-1048"
        title="Harpreet Kaur - Partner Visa"
        description="Agreement preview, signer status and audit timeline in one record."
        action={<Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_8px_20px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"><Send className="h-4 w-4 mr-1" />Send reminder</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-8">
            <div className="rounded-2xl border border-slate-200 bg-[#F7FAF8] p-8 text-center md:text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-6 shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">Service agreement preview</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 font-medium">Professional services agreement for Partner Visa SC 820 with fee schedule, scope and terms ready for signature.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Audit timeline</h2>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {["Agreement created", "Preview generated", "Sent to client", "Client signed"].map((item, index) => (
                <div key={item} className="flex gap-4 relative">
                  <div className="mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white bg-[#0D9F8C] shadow-sm z-10" />
                  <div>
                    <div className="text-sm font-bold text-[#081B2E]">{item}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{index + 1} May 2026</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function SendDocumentPage() {
  const steps = ["Upload", "Signers", "Email", "Review", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [lastSaved, setLastSaved] = React.useState("Just now")
  const [saving, setSaving] = React.useState(false)

  // Step 1: Upload state
  const mockUploadOptions = [
    { name: "SC_820_Onshore_Partner_Checklist_v3.pdf", size: "1.4 MB", type: "PDF", pages: 4 },
    { name: "Form_80_Character_Declaration_Guide.docx", size: "2.1 MB", type: "DOCX", pages: 6 },
    { name: "Subclass_189_Skill_Assessment_Brief.pdf", size: "950 KB", type: "PDF", pages: 3 },
  ]
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; size: string; type: string; pages: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)

  // Step 2: Signers state
  interface SignerItem {
    id: string
    name: string
    email: string
    role: string
    order: number
  }
  const [signersList, setSignersList] = React.useState<SignerItem[]>([
    { id: "S-1", name: "Rajwant Singh (RMA)", email: "rajwant@migrationpractice.com", role: "RMA Agent (Principal)", order: 1 },
    { id: "S-2", name: "Gurpreet Singh", email: "gurpreet.singh@gmail.com", role: "Primary Client (Signer)", order: 2 },
  ])

  // Step 3: Email state
  const mockEmailTemplates = [
    { id: "t1", name: "Standard Visa Intake Signature Request", subject: "Action Required: Digital Signature needed for Australian Visa File", message: "Please review and digitally sign the attached evidentiary document for your Australian visa application. This document must be executed in compliance with OMARA practice requirements. Click the review link below to get started." },
    { id: "t2", name: "Follow-up Evidentiary Declaration Request", subject: "Follow-up: Complete Stat Dec for Subclass 820 Sponsor Details", message: "Following our initial matter interview, we have drafted the necessary sponsor particulars checklist. Please check, digitally countersign the declarations, and verify secure local locks." },
    { id: "t3", name: "Urgent Appeals Representation Mandate", subject: "URGENT: Review AAT Appeals Representation Contract", message: "We have finalized your AAT Review Application particulars. Please execute this retainer agreement immediately so we may log the appeals registry before the statutory deadline." },
  ]
  const [emailSubject, setEmailSubject] = React.useState(mockEmailTemplates[0].subject)
  const [emailMessage, setEmailMessage] = React.useState(mockEmailTemplates[0].message)
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("t1")

  // Step 5: Send state
  const [sendingProgress, setSendingProgress] = React.useState(0)
  const [sendSuccess, setSendSuccess] = React.useState(false)
  const [sendLogs, setSendLogs] = React.useState<string[]>([])

  // Simulated live autosave of wizard values
  React.useEffect(() => {
    setSaving(true)
    const timer = setTimeout(() => {
      setSaving(false)
      const now = new Date()
      setLastSaved(`Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
    }, 600)
    return () => clearTimeout(timer)
  }, [uploadedFile, signersList, emailSubject, emailMessage])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const t = mockEmailTemplates.find(x => x.id === templateId)
    if (t) {
      setEmailSubject(t.subject)
      setEmailMessage(t.message)
    }
  }

  const addSigner = () => {
    const nextOrder = signersList.length + 1
    const newSigner: SignerItem = {
      id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      email: "",
      role: "Sponsor (Signer)",
      order: nextOrder,
    }
    setSignersList([...signersList, newSigner])
  }

  const removeSigner = (id: string) => {
    if (signersList.length <= 1) return
    const filtered = signersList.filter(s => s.id !== id)
    // Recalculate orders
    const updated = filtered.map((s, idx) => ({ ...s, order: idx + 1 }))
    setSignersList(updated)
  }

  const handleSignerChange = (id: string, field: keyof SignerItem, value: string | number) => {
    const updated = signersList.map((s) => {
      if (s.id === id) {
        return { ...s, [field]: value }
      }
      return s
    })
    setSignersList(updated)
  }

  const triggerDispatch = () => {
    setCurrentStep(4)
    setSendingProgress(0)
    setSendSuccess(false)
    setSendLogs([])

    const logs = [
      "Initializing secure cryptographic custody...",
      "Applying anti-malware sandboxing checks...",
      "Locking SHA-256 document integrity hash...",
      "Generating secure signature ledger blocks...",
      "Routing dispatches via AWS Sydney SES node...",
      "Audit trail records locked! Delivery dispatched."
    ]

    let stepIndex = 0
    const interval = setInterval(() => {
      setSendingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setSendSuccess(true)
          return 100
        }
        
        // Append log periodically
        if (stepIndex < logs.length) {
          setSendLogs(curr => [...curr, logs[stepIndex]])
          stepIndex++
        }
        
        return prev + 20
      })
    }, 600)
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setUploadedFile({
            name: "Custom_Practice_Declaration_Index.pdf",
            size: "1.6 MB",
            type: "PDF",
            pages: 4
          })
        }}
        className={cn(
          "flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center p-8 transition-all duration-300",
          dragging 
            ? "border-[#0D9F8C] bg-[#effcf7]/50" 
            : uploadedFile 
              ? "border-[#0D9F8C]/60 bg-emerald-50/10" 
              : "border-slate-200 bg-[#F7FAF8]/40 hover:bg-[#F7FAF8]"
        )}
      >
        {uploadedFile ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-b from-[#effcf7] to-[#ffffff] text-[#0D9F8C] border border-emerald-100 shadow-sm">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#081B2E]">{uploadedFile.name}</h3>
              <p className="text-xs text-slate-400 font-bold mt-1.5">{uploadedFile.size} ΓÇó {uploadedFile.pages} Pages ΓÇó {uploadedFile.type} Document</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUploadedFile(null)} 
                className="h-9 rounded-xl border-slate-200 text-slate-500 font-bold text-xs"
              >
                Change Document
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 animate-pulse">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">Drop PDF here</h2>
              <p className="mt-1 text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                Drag and drop your legal briefs, personal declaration packets, or visa templates up to 10MB here.
              </p>
            </div>
            <div>
              <Button 
                onClick={() => setUploadedFile(mockUploadOptions[0])} 
                className="rounded-xl bg-[#0D9F8C] font-bold shadow-md hover:bg-[#0A5B52]"
              >
                Choose File
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Predefined templates widget */}
      {!uploadedFile && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulate Office Template Selection</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {mockUploadOptions.map((opt) => (
              <button
                key={opt.name}
                onClick={() => setUploadedFile(opt)}
                className="group border border-slate-200/60 rounded-xl bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-[#0D9F8C]/50"
              >
                <div className="text-xs font-bold text-[#081b36] group-hover:text-[#0D9F8C] transition-colors truncate">{opt.name}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1.5">{opt.size} ΓÇó {opt.pages} pages</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button 
          disabled={!uploadedFile}
          onClick={() => setCurrentStep(1)} 
          className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52] disabled:opacity-40 disabled:hover:bg-[#0D9F8C]"
        >
          Assign Signers <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderSignersStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signing Execution Chain</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={addSigner}
            className="h-9 rounded-xl border-slate-200 text-[#0D9F8C] font-bold text-xs hover:bg-[#F7FAF8]"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Recipient Signer
          </Button>
        </div>

        <div className="space-y-3">
          {signersList.map((signer, index) => (
            <div 
              key={signer.id}
              className="grid gap-3 bg-white border border-slate-200/50 rounded-xl p-4 md:grid-cols-[40px_1fr_1.2fr_1fr_40px] md:items-center relative"
            >
              {/* Order ID */}
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-black text-xs">
                {index + 1}
              </div>

              {/* Name */}
              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name
                <Input 
                  required
                  value={signer.name}
                  onChange={(e) => handleSignerChange(signer.id, "name", e.target.value)}
                  placeholder="e.g. Gurpreet Singh" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              {/* Email */}
              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
                <Input 
                  required
                  type="email"
                  value={signer.email}
                  onChange={(e) => handleSignerChange(signer.id, "email", e.target.value)}
                  placeholder="e.g. signer@email.com" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              {/* Role */}
              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Role Select
                <select 
                  value={signer.role}
                  onChange={(e) => handleSignerChange(signer.id, "role", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
                >
                  <option value="RMA Agent (Principal)">RMA Agent (Principal)</option>
                  <option value="Primary Client (Signer)">Primary Client (Signer)</option>
                  <option value="Sponsor (Signer)">Sponsor (Signer)</option>
                  <option value="Witness (Declarant)">Witness (Declarant)</option>
                </select>
              </label>

              {/* Actions */}
              <div className="flex justify-end pt-5 md:pt-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSigner(signer.id)}
                  disabled={signersList.length <= 1}
                  className="h-8 w-8 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button 
          disabled={signersList.some(s => !s.name || !s.email)}
          onClick={() => setCurrentStep(2)} 
          className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52] disabled:opacity-40"
        >
          Email Customise <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Editor */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Intimation Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            >
              {mockEmailTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter secure email header..."
              className="h-11 rounded-xl text-xs font-semibold border-slate-200 bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Message Template</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Draft secure instructions..."
              className="flex min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            />
          </div>
        </div>

        {/* Live Inbox Mockup */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Signer Inbox Preview</div>
          <Card className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Window bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-[#0D9F8C]" />
              </span>
              <span>secure-mail-viewer</span>
            </div>
            
            <div className="p-5 space-y-4 text-[11px] text-[#081B2E]">
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <div><span className="text-slate-400 font-bold">From:</span> ImmiSign Custody <strong className="text-slate-700">deliveries@immisign.com.au</strong></div>
                <div><span className="text-slate-400 font-bold">To:</span> {signersList[1]?.name || "Client"} <strong className="text-slate-700">&lt;{signersList[1]?.email || "client@email.com"}&gt;</strong></div>
                <div><span className="text-slate-400 font-bold">Subject:</span> <strong className="text-slate-700">{emailSubject}</strong></div>
              </div>

              {/* Message body */}
              <div className="space-y-3 leading-relaxed font-semibold text-slate-600">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-[#0D9F8C] border border-emerald-100">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-black text-[#081b36] tracking-tight">ImmiSign OMARA Compliant Portal</span>
                </div>

                <p>Dear {signersList[1]?.name || "Client Signatory"},</p>
                
                <p className="whitespace-pre-wrap">{emailMessage}</p>

                <div className="py-2">
                  <button type="button" className="w-full bg-[#0D9F8C] text-white font-bold rounded-xl py-3 text-center shadow-[0_6px_16px_rgba(13,159,140,0.12)]">
                    Review & Sign Document
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-medium">
                  This transaction is locked with SHA-256 cryptographic audit logs inside Sydney data zones. Access is secure under the Australian Privacy Act guidance rules.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(3)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Review Packet <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Verification Summary */}
        <div className="space-y-5 text-xs text-[#081B2E]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="font-bold text-sm text-[#081b36]">Intake File Summary</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Document Pack</span>
                <div className="font-bold text-slate-700 truncate">{uploadedFile?.name}</div>
                <div className="text-[10px] text-slate-400 font-bold">{uploadedFile?.size} ΓÇó {uploadedFile?.pages} pages</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">SHA-256 Ledger Draft</span>
                <div className="font-bold text-[#0D9F8C] font-mono tracking-tight truncate">Draft_SHA_820-Kaur</div>
                <div className="text-[10px] text-slate-400 font-bold">AES-256 Lock Waiting</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="font-bold text-sm text-[#081b36]">Signature Execution Chain</div>
            <div className="space-y-2">
              {signersList.map((s, idx) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-[10px] font-black text-[#0D9F8C]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-700">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{s.email}</div>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-100/50 px-2 py-0.5 text-[9px] font-bold text-[#0A8F7E] uppercase">{s.role.split(" (")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Paper Document Preview */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual Signature Alignment Preview</div>
          <Card className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm text-[10px] text-slate-500 font-semibold space-y-5 relative min-h-[300px]">
            <div className="absolute top-4 right-4 bg-emerald-50 text-[#0D9F8C] border border-emerald-100 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
              Secure Ledger Preview
            </div>

            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-800 text-xs truncate max-w-[200px]">{uploadedFile?.name}</div>
                <div className="text-[9px] text-slate-400 font-medium">Australian Migration Code OMARA Compliant</div>
              </div>
            </div>

            {/* Simulated paragraph outlines */}
            <div className="space-y-2.5 pt-2">
              <div className="h-3.5 bg-slate-50 rounded w-11/12" />
              <div className="h-3.5 bg-slate-50 rounded w-full" />
              <div className="h-3.5 bg-slate-50 rounded w-4/5" />
            </div>

            {/* Signature Tag indicators */}
            <div className="border-t border-slate-100 pt-6 mt-10 grid gap-4 grid-cols-2">
              <div className="p-3.5 rounded-xl border border-[#0D9F8C]/20 bg-[#effcf7]/30 border-dashed relative">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0D9F8C] absolute top-2 right-2 animate-ping" />
                <div className="text-[8px] uppercase tracking-wider text-[#0D9F8C] font-black">SIGN HERE</div>
                <div className="font-bold text-slate-800 mt-2 truncate">{signersList[0]?.name}</div>
                <div className="text-[8px] text-slate-400 mt-0.5 truncate">{signersList[0]?.role.split(" (")[0]}</div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-300/40 bg-amber-50/10 border-dashed relative">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 absolute top-2 right-2 animate-pulse" />
                <div className="text-[8px] uppercase tracking-wider text-amber-600 font-black">SIGN HERE</div>
                <div className="font-bold text-slate-800 mt-2 truncate">{signersList[1]?.name}</div>
                <div className="text-[8px] text-slate-400 mt-0.5 truncate">{signersList[1]?.role.split(" (")[0]}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={triggerDispatch} className="rounded-xl bg-[#0D9F8C] font-bold px-8 shadow-md hover:bg-[#0A5B52]">
          Authorize & Dispatch Packet <Send className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderSendStep = () => (
    <div className="space-y-6">
      {sendSuccess ? (
        <Card className="rounded-2xl border border-emerald-100 bg-[#f8fffd]/80 p-8 text-center shadow-[0_12px_40px_rgba(13,159,140,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-6 animate-pulse">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-[#081b36]">Packet Sealed & Sent!</h2>
          <p className="mt-3 text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            The migration document <strong className="text-slate-800">{uploadedFile?.name}</strong> has been securely AES-256 locked, registered on-shore, and sent to <strong className="text-slate-800">{signersList[1]?.email}</strong>.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-slate-100 border border-slate-200/50 px-3.5 py-1 text-[10px] font-bold text-slate-500 font-mono">
              HASH: SHA-256#DOC-{Math.floor(100000 + Math.random() * 900000)}
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1 text-[10px] font-bold text-[#0D9F8C]">
              OMARA Audit Active
            </span>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-bold">
              <Link href="/documents/library">Go to Library</Link>
            </Button>
            <Button 
              onClick={() => {
                setUploadedFile(null);
                setSignersList([
                  { id: "S-1", name: "Rajwant Singh (RMA)", email: "rajwant@migrationpractice.com", role: "RMA Agent (Principal)", order: 1 },
                  { id: "S-2", name: "Gurpreet Singh", email: "gurpreet.singh@gmail.com", role: "Primary Client (Signer)", order: 2 },
                ]);
                setEmailSubject(mockEmailTemplates[0].subject);
                setEmailMessage(mockEmailTemplates[0].message);
                setCurrentStep(0);
              }} 
              className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]"
            >
              Send Another Document
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">Cryptographic Seal Progress</h2>
            <p className="text-xs text-slate-400 font-semibold">Encrypting files, preparing delivery registers and audit signatures.</p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Sealing Packet...</span>
              <span>{sendingProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
              <div className="h-full bg-[#0D9F8C] transition-all duration-300 rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]" style={{ width: `${sendingProgress}%` }} />
            </div>
          </div>

          {/* Secure logs */}
          <div className="max-w-md mx-auto bg-slate-50/50 rounded-xl p-4 border border-slate-150 text-left font-mono text-[9px] text-slate-500 space-y-2 min-h-[140px] flex flex-col justify-end">
            {sendLogs.map((log, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-[#0D9F8C] font-black">Γ£ô</span>
                <span>{log}</span>
              </div>
            ))}
            {sendingProgress < 100 && (
              <div className="flex gap-2 items-center text-slate-400 animate-pulse">
                <span className="animate-spin text-[#0D9F8C] font-black">Γ£ª</span>
                <span>Processing next secure payload block...</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderUploadStep()
      case 1:
        return renderSignersStep()
      case 2:
        return renderEmailStep()
      case 3:
        return renderReviewStep()
      case 4:
      default:
        return renderSendStep()
    }
  }

  return (
    <div className="animate-enter space-y-6">
      <PageHeader 
        eyebrow="Send document" 
        title="Secure dispatch pipeline" 
        description="A premium structured stepper to sign, authenticate, audit and send custom checklists or briefs." 
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left indicators */}
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/50 bg-white/60 p-4 shadow-sm space-y-1">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep
              const isActive = index === currentStep
              return (
                <button
                  key={step}
                  disabled={currentStep === 4}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl p-3.5 font-bold text-xs transition-all text-left",
                    isActive 
                      ? "bg-emerald-50/50 text-[#0D9F8C] border border-emerald-100/50 shadow-sm" 
                      : isCompleted 
                        ? "text-[#0D9F8C] hover:bg-slate-50"
                        : "text-slate-400 opacity-60"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black transition-all",
                    isActive 
                      ? "bg-[#0D9F8C] text-white shadow-[0_6px_16px_rgba(13,159,140,0.22)]" 
                      : isCompleted 
                        ? "bg-emerald-50 text-[#0D9F8C] border border-emerald-100" 
                        : "bg-white text-slate-400 border border-slate-200"
                  )}>
                    {isCompleted ? "Γ£ô" : index + 1}
                  </div>
                  {step}
                </button>
              )
            })}
          </Card>

          {/* Sticky quick details */}
          <Card className="rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-sm space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Status</div>
              <div className="flex items-center gap-2 mt-1.5">
                {saving ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-[#0D9F8C] animate-pulse">
                    Autosaving...
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {lastSaved}
                  </span>
                )}
              </div>
            </div>

            {uploadedFile && (
              <div className="border-t border-slate-100 pt-3.5 space-y-1.5 text-[10px] font-semibold text-slate-500">
                <div className="text-slate-400 uppercase tracking-wider text-[8px] font-bold">Document Locked</div>
                <div className="text-[#081B2E] font-bold truncate">{uploadedFile.name}</div>
                <div>{uploadedFile.size} ΓÇó {uploadedFile.pages} pages</div>
              </div>
            )}
          </Card>
        </div>

        {/* Right workspace Card */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">{steps[currentStep]} Details</h2>
              <span className="rounded-full bg-emerald-50/50 border border-emerald-100 px-3 py-0.5 text-[10px] font-black text-[#0D9F8C]">
                Step {currentStep + 1} of 5
              </span>
            </div>

            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function DocumentLibraryPage() {
  interface DocumentItem {
    id: string
    name: string
    category: string
    size: string
    type: string
    date: string
    downloads: number
  }

  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState("All")
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)
  
  // Simulated Upload Modal States
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadSuccess, setUploadSuccess] = React.useState(false)
  const [newFileName, setNewFileName] = React.useState("")
  const [newFileCategory, setNewFileCategory] = React.useState("Partner Visa")

  // Selected Document Inspector State
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentItem | null>(null)
  
  // Custom Dynamic Toast simulation
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const [documentsList, setDocumentsList] = React.useState<DocumentItem[]>([
    { id: "DOC-3940", name: "SC_820_Partner_Visa_Intake_Checklist.pdf", category: "Partner Visa", size: "1.4 MB", type: "PDF", date: "24 May 2026", downloads: 48 },
    { id: "DOC-3939", name: "Form_80_Personal_Particulars_Instruction_Guide.docx", category: "Partner Visa", size: "2.1 MB", type: "DOCX", date: "22 May 2026", downloads: 124 },
    { id: "DOC-3938", name: "SC_190_Skilled_Nomination_Evidentiary_Brief.pdf", category: "Skilled Migration", size: "950 KB", type: "PDF", date: "20 May 2026", downloads: 82 },
    { id: "DOC-3937", name: "SC_143_Contributory_Parent_Sponsorship_Guide.pdf", category: "Parent Visa", size: "3.2 MB", type: "PDF", date: "18 May 2026", downloads: 19 },
    { id: "DOC-3936", name: "AAT_Tribunal_Review_Application_Template.docx", category: "Appeals", size: "1.8 MB", type: "DOCX", date: "14 May 2026", downloads: 35 },
    { id: "DOC-3935", name: "Sponsor_Statutory_Declaration_Template_v2.docx", category: "Partner Visa", size: "1.1 MB", type: "DOCX", date: "10 May 2026", downloads: 96 },
    { id: "DOC-3934", name: "Points_Test_Migration_Calculators_Default.xlsx", category: "Skilled Migration", size: "780 KB", type: "XLSX", date: "06 May 2026", downloads: 140 },
    { id: "DOC-3933", name: "Office_Code_of_Conduct_OMARA_2026.pdf", category: "Appeals", size: "4.5 MB", type: "PDF", date: "02 May 2026", downloads: 12 },
  ])

  // Mock template select options for simulated drag/drop choose
  const mockLocalTemplateOptions = [
    { name: "SC_482_Sponsor_Declaration_Requirements.pdf", category: "Skilled Migration", size: "1.1 MB" },
    { name: "Parent_Visa_Subclass_103_Evidentiary_Grid.docx", category: "Parent Visa", size: "2.4 MB" },
    { name: "AAT_Visa_Refusal_Submission_Structure.pdf", category: "Appeals", size: "3.6 MB" },
  ]

  // Filter lists
  const filteredDocs = documentsList.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Recent Templates (First 3 in documentsList)
  const recentTemplates = documentsList.slice(0, 3)

  // Trigger Dynamic State Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Simulated Upload Submission
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName) return
    setUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          setUploadSuccess(true)

          // Append to dynamic documents list
          const type = newFileName.split(".").pop()?.toUpperCase() || "PDF"
          const newDoc: DocumentItem = {
            id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
            name: newFileName.endsWith(".pdf") || newFileName.endsWith(".docx") ? newFileName : `${newFileName}.pdf`,
            category: newFileCategory,
            size: "1.5 MB",
            type: type,
            date: "Today",
            downloads: 0
          }
          setDocumentsList((prevDocs) => [newDoc, ...prevDocs])
          triggerToast(`Document "${newDoc.name}" uploaded & scanned successfully!`)
          return 100
        }
        return prev + 25
      })
    }, 200)
  }

  const deleteDocument = (id: string, name: string) => {
    setDocumentsList(prev => prev.filter(doc => doc.id !== id))
    setSelectedDoc(null)
    triggerToast(`Document "${name}" has been deleted from cloud storage.`)
  }

  const simulateDownload = (name: string) => {
    triggerToast(`Downloading: Decrypting ${name} in safe custody...`)
    setTimeout(() => {
      triggerToast(`Successfully downloaded "${name}" to your workspace!`)
    }, 1500)
  }

  const resetUploadModal = () => {
    setIsUploadOpen(false)
    setUploading(false)
    setUploadProgress(0)
    setUploadSuccess(false)
    setNewFileName("")
  }

  return (
    <div className="animate-enter space-y-6 relative">
      {/* Visual Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-enter rounded-xl border border-emerald-100 bg-white/90 p-4 text-xs font-bold text-[#0D9F8C] shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <ShieldCheck className="h-5 w-5 text-[#0D9F8C] shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <PageHeader
        eyebrow="Document library"
        title="Templates and documents"
        description="Searchable, category-based library for approved migration documents, checklists and reusable office packs."
        action={
          <Button onClick={() => setIsUploadOpen(true)} className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]">
            <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Document
          </Button>
        }
      />

      {/* Usage Analytics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Documents", value: documentsList.length, desc: "Across 4 main subclasses", progress: (documentsList.length / 20) * 100 },
          { label: "Standard Templates", value: documentsList.filter(d => d.downloads > 40).length, desc: "Pre-approved OMARA scope", progress: 60 },
          { label: "Recent Uploads", value: 3, desc: "Added within past 7 days", progress: 30 },
          { label: "Vault Space Used", value: "18.4 MB", desc: "Of 1.0 GB Cloud Custody", progress: 1.84 },
        ].map((stat, idx) => (
          <Card key={idx} className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <CardContent className="p-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className="mt-3 text-2xl font-black text-[#081B2E] tracking-tight">{stat.value}</div>
              <div className="mt-1 text-[10px] text-[#0D9F8C] font-bold">{stat.desc}</div>
              <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-slate-100/80">
                <div className="chart-bar h-full rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]" style={{ width: `${stat.progress}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asymmetric Two-Column Shell */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        
        {/* Left Wider Panel: Search, Categories & Library Grid */}
        <div className="space-y-6">
          
          {/* Quick Access Recent Documents Carousel Row */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Quick Access Templates</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0D9F8C] animate-ping" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {recentTemplates.map((doc) => (
                <Card 
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group rounded-xl border border-[#0D9F8C]/15 bg-[#f5fbf9]/60 p-4 shadow-sm hover:border-[#0D9F8C]/50 hover:bg-white cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="rounded-full bg-emerald-100/60 px-2 py-0.5 text-[8px] font-black text-[#0A8F7E] uppercase">LATEST</span>
                    <span className="text-[9px] text-slate-400 font-bold">{doc.size}</span>
                  </div>
                  <h3 className="text-xs font-bold text-[#081b36] mt-3 group-hover:text-[#0D9F8C] transition-colors truncate">{doc.name}</h3>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mt-3 pt-2.5 border-t border-slate-100">
                    <span>{doc.downloads} downloads</span>
                    <ArrowRight className="h-3 w-3 text-[#0D9F8C] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Library Search & Counter Filters Bar */}
          <div className="space-y-4 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search template documents by filename, code subclasses, or ID..." 
                className="h-12 rounded-xl border-slate-200 bg-white pl-11 focus-visible:ring-1 focus-visible:ring-[#0D9F8C] placeholder:text-slate-400 text-xs font-semibold"
              />
            </div>

            {/* Categories filter pills */}
            <div className="flex flex-wrap gap-2">
              {["All", "Partner Visa", "Parent Visa", "Skilled Migration", "Appeals"].map((category) => {
                const count = category === "All" 
                  ? documentsList.length 
                  : documentsList.filter(d => d.category === category).length
                const isActive = activeCategory === category
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-300 flex items-center gap-2",
                      isActive 
                        ? "bg-[#0D9F8C] text-white shadow-[0_6px_16px_rgba(13,159,140,0.12)]" 
                        : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60"
                    )}
                  >
                    {category}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-black transition-all",
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Master Grid list of files */}
          <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <Card 
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(8,27,46,0.04)] hover:border-slate-350/50 cursor-pointer"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Top Row info */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#effcf7] to-[#ffffff] text-[#0D9F8C] border border-emerald-100/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <span className="rounded bg-slate-100 border border-slate-200/40 px-2 py-0.5 text-[8px] font-bold text-slate-400 uppercase">{doc.type}</span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">{doc.size}</div>
                      </div>
                    </div>

                    {/* File particulars */}
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-[#081B2E] truncate group-hover:text-[#0D9F8C] transition-colors">{doc.name}</h3>
                      <div className="flex gap-2 items-center mt-2">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-[#0D9F8C]">{doc.category}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{doc.id}</span>
                      </div>
                    </div>

                    {/* Action metadata row */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-[10px] text-slate-400 font-bold">
                      <span>{doc.downloads} downloads</span>
                      <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#0D9F8C] transition-colors">
                        <span>Added {doc.date}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center col-span-full rounded-2xl border border-slate-200/50 bg-white/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-200">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#081B2E]">No documents match search</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Try modifying your query or category filters.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Narrower Panel: Cloud Storage Sidebar */}
        <div className="space-y-5">
          {/* Custody storage specs */}
          <Card className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Vault Custody Storage</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[#081B2E]">1.8% Allocated</h3>
            </div>
            
            <div className="space-y-1.5">
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                <div className="h-full bg-[#0D9F8C] rounded-full" style={{ width: "1.84%" }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                <span>18.4 MB Used</span>
                <span>1.0 GB Cloud Limit</span>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
              Checklists, client evidence, and OMARA agreements are protected onshore under Australian Privacy principles with automatic AES-256 backup locks.
            </p>
          </Card>

          {/* Office uploads logs feed */}
          <Card className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="font-bold text-xs text-[#081B2E] uppercase tracking-wider border-b border-slate-100 pb-2">
              Recent Library Operations
            </div>

            <div className="space-y-3.5">
              {[
                { rma: "Rajwant Singh (Principal)", action: "uploaded statutory declarations", time: "2h ago", id: "DOC-3940" },
                { rma: "Rajwant Singh (Principal)", action: "scanned checklist Form 80", time: "1d ago", id: "DOC-3939" },
                { rma: "Priya Mehta (Admin)", action: "downloaded Skilled Nomination brief", time: "2d ago", id: "DOC-3938" },
              ].map((log, idx) => (
                <div key={idx} className="flex gap-3 text-[10px] font-semibold">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-black text-slate-500 text-[9px]">
                    {log.rma.split(" ")[0][0]}
                  </div>
                  <div>
                    <div className="text-slate-700 font-bold">
                      {log.rma.split(" ")[0]} <span className="text-slate-400 font-semibold">{log.action}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-0.5">{log.id} ΓÇó {log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>

      {/* Document Detailed Inspector Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-6 rounded-2xl shadow-2xl">
          {selectedDoc && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                <DialogTitle className="text-base font-black text-[#081B2E] truncate">{selectedDoc.name}</DialogTitle>
                <div className="text-[10px] text-slate-400 font-bold mt-1">ID: {selectedDoc.id} ΓÇó Secure Cloud Custody Records</div>
              </DialogHeader>

              <div className="space-y-5 text-xs text-[#081B2E]">
                {/* Security Seal */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f5fbf9]/80 border border-emerald-100/60">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">LODGEMENT INTEGRITY STATUS</span>
                    <div className="font-bold text-xs text-[#0D9F8C]">DHA Compliant & Hashed</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>

                {/* Grid attributes */}
                <div className="grid gap-3.5 grid-cols-2">
                  <div className="p-3 rounded-xl border border-slate-100 space-y-1 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Category subclass</span>
                    <div className="font-bold text-slate-700">{selectedDoc.category}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 space-y-1 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Decryption key</span>
                    <div className="font-mono text-[9px] text-slate-500 font-bold truncate">SHA-256#DOC-{selectedDoc.id.split("-")[1]}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">Document Parameters</span>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden font-semibold">
                    <div className="flex justify-between p-2.5 bg-slate-50/30">
                      <span className="text-slate-400">File Storage Size</span>
                      <span>{selectedDoc.size}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-400">Lodge Extension Format</span>
                      <span>{selectedDoc.type} File</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50/30">
                      <span className="text-slate-400">Total Downloads Tracking</span>
                      <span>{selectedDoc.downloads} Decryptions</span>
                    </div>
                  </div>
                </div>

                {/* Audit timelines */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[9px] leading-relaxed text-slate-500 font-medium">
                  <strong>Audited IP Access Log:</strong> Checked and approved by Rajwant Singh under Australian Migration Agent Regulation guidelines.
                </div>

                {/* Actions Panel */}
                <div className="border-t border-slate-150 pt-4 space-y-2">
                  <div className="grid gap-2 grid-cols-2">
                    <Button asChild onClick={() => setSelectedDoc(null)} className="h-10 rounded-xl bg-[#0D9F8C] hover:bg-[#0A5B52] font-bold text-xs text-white">
                      <Link href="/agreements/new">Use in Wizard</Link>
                    </Button>
                    <Button asChild onClick={() => setSelectedDoc(null)} className="h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs">
                      <Link href="/documents/send">Send for Signing</Link>
                    </Button>
                  </div>
                  
                  <div className="grid gap-2 grid-cols-2">
                    <Button 
                      type="button" 
                      onClick={() => simulateDownload(selectedDoc.name)} 
                      className="h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Decrypt & Download
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => deleteDocument(selectedDoc.id, selectedDoc.name)}
                      className="h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Document
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog Modal with select templates selection */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => !open && resetUploadModal()}>
        <DialogContent className="max-w-md bg-white border-slate-250 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
            <DialogTitle className="text-base font-black text-[#081B2E]">Upload to Cloud Custody</DialogTitle>
          </DialogHeader>

          {uploadSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-[#081b36]">Upload Successful!</h3>
              <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">
                The file <strong className="text-slate-800">{newFileName}</strong> has been successfully scanned, AES-256 encrypted onshore, and added to the <strong className="text-slate-800">{newFileCategory}</strong> index.
              </p>
              <Button onClick={resetUploadModal} className="mt-4 bg-[#0D9F8C] hover:bg-[#0A5B52] rounded-xl font-bold text-xs">
                Back to Library
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-slate-500 font-semibold">
              <div className="space-y-2">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Document Title / Filename</label>
                <Input 
                  required
                  placeholder="e.g. SC-820_Evidence_Index.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Target Visa Category</label>
                <select
                  value={newFileCategory}
                  onChange={(e) => setNewFileCategory(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
                  disabled={uploading}
                >
                  <option value="Partner Visa">Partner Visa</option>
                  <option value="Parent Visa">Parent Visa</option>
                  <option value="Skilled Migration">Skilled Migration</option>
                  <option value="Appeals">Appeals</option>
                </select>
              </div>

              {uploading ? (
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Malware Scanning & AES-256 encrypting...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                    <div className="h-full bg-[#0D9F8C] transition-all duration-300 rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 text-center leading-normal">Writing cryptographical registry seal securely in Sydney vaults.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select local template file shortcut */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Simulate Local File Choose</label>
                    <div className="grid gap-2 grid-cols-1">
                      {mockLocalTemplateOptions.map((opt) => (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => {
                            setNewFileName(opt.name)
                            setNewFileCategory(opt.category)
                          }}
                          className="flex justify-between items-center border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg text-left"
                        >
                          <span className="font-bold text-[#081b36] text-[10px] truncate max-w-[280px]">{opt.name}</span>
                          <span className="text-[8px] font-bold text-slate-400 shrink-0">{opt.size}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                    <div className="mt-2 text-xs font-bold text-[#0D9F8C]">Drag & drop files here</div>
                    <p className="text-[9px] text-slate-400 mt-1">PDF, DOCX, PNG up to 10MB.</p>
                  </div>
                </div>
              )}

              {!uploading && (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" type="button" onClick={resetUploadModal} className="h-9 rounded-xl border-slate-200 px-4 font-bold text-xs text-slate-500">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newFileName} className="h-9 rounded-xl bg-[#0D9F8C] hover:bg-[#0A5B52] px-5 font-bold text-xs disabled:opacity-40">
                    Upload & Scans File
                  </Button>
                </div>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ClientsPage() {
  return (
    <div>
      <PageHeader eyebrow="Clients" title="Client relationship workspace" description="Premium CRM-style profiles connected to agreements, documents, notes and matter timelines." action={<Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"><Plus className="h-4 w-4 mr-1" />New client</Button>} />
      <Toolbar placeholder="Search clients" />
      <div className="grid gap-3">
        {clients.map((client) => (
          <Link key={client.name} href={`/clients/${client.name.toLowerCase().split(" ")[0]}`} className="grid gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-colors hover:bg-white/90 md:grid-cols-[1fr_0.8fr_0.6fr_0.6fr_auto] md:items-center">
            <div>
              <div className="font-bold text-[#081B2E]">{client.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{client.email}</div>
            </div>
            <div><StatusPill status={client.stage} /></div>
            <div className="text-sm font-semibold text-slate-600">{client.matters} matters</div>
            <div className="text-sm font-bold text-[#081B2E]">{client.value}</div>
            <ArrowRight className="h-4 w-4 text-slate-300 hover:text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ClientDetailPage() {
  return (
    <div>
      <PageHeader eyebrow="Client profile" title="Harpreet Kaur" description="Agreement history, sent documents, notes and matter timeline." />
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Profile</h2>
            <div className="space-y-3 text-sm">
              {["Partner Visa - SC 820", "harpreet@example.com", "+61 400 111 222", "Responsible RMA: Rajwant Singh"].map((item) => (
                <div key={item} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 font-semibold text-slate-600">{item}</div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Timeline</h2>
            <div className="space-y-5">
              {["Agreement signed", "Document pack sent", "Client note added", "Matter created"].map((item) => (
                <div key={item} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50/60 text-[#0D9F8C] border border-emerald-100/50 shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#081B2E]">{item}</div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">Updated today</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Analytics" title="Practice analytics" description="Agreement, signature, revenue, team and document insights in a calm executive view." />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Agreement conversion" value="78%" change="+9%" icon={FileCheck2} />
        <MetricCard label="Avg signature time" value="1.8d" change="-22%" icon={Clock3} />
        <MetricCard label="Revenue tracked" value="$128k" change="+18%" icon={BarChart3} />
        <MetricCard label="Docs managed" value="1,284" change="+31%" icon={FileArchive} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MiniChart />
        <Card className="rounded-2xl border border-slate-200/50 bg-[radial-gradient(circle_at_18%_0%,rgba(51,196,141,0.12),transparent_35%),linear-gradient(135deg,#021815,#011210)] p-6 text-white shadow-[0_20px_50px_rgba(2,18,16,0.30)]">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#33C48D]/5 blur-3xl" />
          <h2 className="text-lg font-bold tracking-tight">Team performance</h2>
          <p className="mt-1 text-xs text-emerald-100/40 font-semibold leading-relaxed">Weighted by agreements moved, signature cycle time and document completion.</p>
          <div className="mt-6 space-y-5">
            {["Rajwant Singh", "Priya Mehta", "Aman Gill"].map((name, index) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span>{name}</span>
                  <span className="text-[#33C48D]">{[92, 84, 76][index]}%</span>
                </div>
                <div className="h-[6px] rounded-full bg-white/10 overflow-hidden">
                  <div className="chart-bar h-full rounded-full bg-gradient-to-r from-[#33C48D] to-emerald-250" style={{ width: `${[92, 84, 76][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">Signature heatmap</h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">Signature volume across practice cases.</p>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg border border-slate-100 bg-[#0D9F8C]"
                  style={{ opacity: 0.12 + ((index * 13) % 75) / 100 }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Executive comparison</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Cycle time", "1.8 days", "22% faster"],
                ["Completion", "86%", "9% above target"],
                ["Revenue", "$128k", "18% growth"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                  <div className="mt-3 text-2xl font-bold tracking-tight text-[#081B2E]">{value}</div>
                  <div className="mt-1.5 text-xs font-bold text-[#0D9F8C]">{detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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

/*
export function SettingsPage({ section = "Agency Profile" }: { section?: string }) {
  const { 
    activeWorkspace, 
    simulatedRole, 
    user, 
    invitePractitioner, 
    updateWorkspaceBranding 
  } = useAuthStore()

  // Fallback defaults if hot reloads clear session
  const currentWorkspace = activeWorkspace || {
    name: "AVC Migration Partners",
    slug: "avc-migration",
    initials: "AM",
    color: "#0D9F8C",
    address: "Level 14, 175 Pitt Street, Sydney NSW 2000",
    marn: "1794016",
    abn: "45 128 349 820",
    team: [
      { name: "Rajwant Singh", role: "Principal RMA", marn: "MARN 1794016", status: "Active", email: "rajwant@avcmigration.com.au" }
    ]
  }
  const currentRole = simulatedRole || user?.role || "Owner"
  const currentSlug = currentWorkspace.slug

  // Settings navigation items split into Workspace and Personal
  const workspaceItems = [
    ["Agency Profile", "Agency Profile"],
    ["Branding", "Branding"],
    ["Team Setup", "Team"],
    ["Clauses Library", "Clauses"],
    ["Matter Defaults", "Matter Types"],
  ] as const

  const personalItems = [
    ["My Profile", "My Profile"],
    ["MFA Security", "Security"],
  ] as const

  // Global Float Toast State
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // 1. Team State & Invitation Modal
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteName, setInviteName] = React.useState("")
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteMarn, setInviteMarn] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("Migration Agent")
  const [inviteProgress, setInviteProgress] = React.useState(0)
  const [inviting, setInviting] = React.useState(false)

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return
    setInviting(true)
    setInviteProgress(0)

    const interval = setInterval(() => {
      setInviteProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setInviting(false)
          setIsInviteOpen(false)

          invitePractitioner(
            inviteName,
            inviteEmail,
            inviteRole,
            inviteMarn
          )

          triggerToast(`Workspace invitation sent to ${inviteName}!`)
          
          // Reset states
          setInviteName("")
          setInviteEmail("")
          setInviteMarn("")
          return 100
        }
        return prev + 25
      })
    }, 150)
  }

  // 2. Branding State
  const [brandColor, setBrandColor] = React.useState(currentWorkspace.color)
  const [brandInitials, setBrandInitials] = React.useState(currentWorkspace.initials)

  const handleSaveBranding = () => {
    updateWorkspaceBranding(brandColor, brandInitials)
    triggerToast("Workspace branding settings updated successfully!")
  }

  // Sync brand details if active workspace changes
  React.useEffect(() => {
    if (activeWorkspace) {
      setBrandColor(activeWorkspace.color)
      setBrandInitials(activeWorkspace.initials)
    }
  }, [activeWorkspace])

  // 3. Clauses State & Add Clause Modal
  interface ClauseItem {
    key: string
    title: string
    text: string
  }
  const [clausesList, setClausesList] = React.useState<ClauseItem[]>([
    { key: "CLAUSE-820-FEE", title: "Partner Visa Instalment Structure", text: "Specifies professional fees structured into 50% upfront retainer and 50% lodging milestone." },
    { key: "CLAUSE-OMARA-MANDATE", title: "OMARA Consumer Guide Mandate", text: "Explicitly references consumer rights, OMARA Code of Conduct, and client files access terms." },
    { key: "CLAUSE-REFUND-DISCLAIMER", title: "Lodgement Fee Refund Disclaimer", text: "Declares that Department of Home Affairs visa fees are strictly non-refundable upon lodgement." },
  ])
  const [isClauseOpen, setIsClauseOpen] = React.useState(false)
  const [clauseKey, setClauseKey] = React.useState("")
  const [clauseTitle, setClauseTitle] = React.useState("")
  const [clauseText, setClauseText] = React.useState("")

  const handleClauseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clauseKey || !clauseTitle || !clauseText) return

    const newClause: ClauseItem = {
      key: clauseKey.toUpperCase().replace(/\s+/g, "-"),
      title: clauseTitle,
      text: clauseText
    }
    setClausesList([newClause, ...clausesList])
    setIsClauseOpen(false)
    triggerToast(`Boilerplate clause ${newClause.key} added successfully!`)

    // Reset states
    setClauseKey("")
    setClauseTitle("")
    setClauseText("")
  }

  // 4. Security Settings State
  const [mfaEnabled, setMfaEnabled] = React.useState(true)
  const [mfaUpdating, setMfaUpdating] = React.useState(false)
  const [activeSessions, setActiveSessions] = React.useState([
    { ip: "203.0.113.19", device: "Chrome on macOS (Sydney, AU)", time: "Current Session", id: "sess-1" },
    { ip: "203.0.113.82", device: "Safari on iOS (Melbourne, AU)", time: "Yesterday, 4:18 PM", id: "sess-2" },
    { ip: "198.51.100.41", device: "Firefox on Windows (Brisbane, AU)", time: "3 days ago", id: "sess-3" },
  ])

  const handleMfaToggle = () => {
    setMfaUpdating(true)
    setTimeout(() => {
      setMfaEnabled(!mfaEnabled)
      setMfaUpdating(false)
      triggerToast(`MFA security enforcement has been ${!mfaEnabled ? "ENABLED" : "DISABLED"}!`)
    }, 500)
  }

  const revokeSession = (id: string, ip: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== id))
    triggerToast(`Session for IP ${ip} has been terminated successfully.`)
  }

  // Permissions lock warning check
  const isSettingsRestricted = currentRole === "Assistant" || currentRole === "Read-only staff"

  const renderAgencyProfile = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Business Name
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.name} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          ABN (Australian Business Number)
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.abn} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Principal MARN Registration
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.marn} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Office Address
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.address} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Practice Timezone
          <select disabled={isSettingsRestricted} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]">
            <option value="AEST">Australian Eastern Standard Time (AEST) - Sydney</option>
            <option value="AWST">Australian Western Standard Time (AWST) - Perth</option>
            <option value="ACST">Australian Central Standard Time (ACST) - Adelaide</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Regulatory Authority Jurisdiction
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue="OMARA Australia" disabled />
        </label>
      </div>
      {!isSettingsRestricted && (
        <Button onClick={() => triggerToast("Agency profile details updated successfully!")} className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Profile</Button>
      )}
    </div>
  )

  const renderTeam = () => {
          <div>
            <h3 className="text-sm font-bold text-[#081B2E]">Workspace Practitioners</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Manage registered agents and assistant user seats.</p>
          </div>
          <Button size="sm" className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
            <Plus className="h-4 w-4 mr-1" /> Invite Practitioner
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100">
          {teamMembers.map((member) => (
            <div key={member.name} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-[#0D9F8C]">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#081B2E]">{member.name}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{member.email} ΓÇó {member.marn}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{member.role}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderBranding = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-[#081B2E]">Email & Template Branding</h3>
        <p className="text-xs text-slate-400 mt-1 font-semibold">Customise client-facing email skins, accent theme colors, and custom headers.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Email Primary Accent Color
            <div className="flex items-center gap-3 mt-1">
              <span className="h-8 w-8 rounded-lg bg-[#0D9F8C] border border-slate-200"></span>
              <Input className="h-11 max-w-[120px] rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue="#0D9F8C" />
              <span className="text-xs text-slate-400 font-semibold">ImmiSign Emerald (Default)</span>
            </div>
          </label>
          
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Practitioner Dynamic Signature Panel
            <textarea className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]" defaultValue="Best regards,&#13;&#10;{PractitionerName}&#13;&#10;Registered Migration Agent (MARN: {PractitionerMARN})" />
          </label>
        </div>

        <div className="space-y-4">
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Workspace Logo (SVG or PNG)
            <div className="mt-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="space-y-2">
                <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                <div className="text-xs font-bold text-[#0D9F8C]">Click to upload logo</div>
                <p className="text-[10px] text-slate-400 font-semibold">Max size 2MB. Transparent background recommended.</p>
              </div>
            </div>
          </label>
        </div>
      </div>
      <Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Branding</Button>
    </div>
  )

  const renderClauses = () => {
    const clauses = [
      { key: "CLAUSE-820-FEE", title: "Partner Visa Instalment Structure", text: "Specifies professional fees structured into 50% upfront retainer and 50% lodging milestone." },
      { key: "CLAUSE-OMARA-MANDATE", title: "OMARA Consumer Guide Mandate", text: "Explicitly references consumer rights, OMARA Code of Conduct, and client files access terms." },
      { key: "CLAUSE-REFUND-DISCLAIMER", title: "Lodgement Fee Refund Disclaimer", text: "Declares that Department of Home Affairs visa fees are strictly non-refundable upon lodgement." },
    ]
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#081B2E]">Visa Clause Libraries</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Reusable legal boilerplate and terms to drag-and-drop into service agreements.</p>
          </div>
          <Button size="sm" className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
            <Plus className="h-4 w-4 mr-1" /> Add Clause
          </Button>
        </div>

        <div className="grid gap-4">
          {clauses.map((clause) => (
            <div key={clause.key} className="rounded-xl border border-slate-200/50 bg-white p-5 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#0D9F8C] bg-emerald-50 px-2 py-0.5 rounded">{clause.key}</span>
                  <h4 className="mt-2 text-sm font-bold text-[#081B2E]">{clause.title}</h4>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-semibold">{clause.text}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-lg hover:bg-slate-50">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMatterTypes = () => {
    const subclasses = [
      { subclass: "SC 820 / SC 801", title: "Partner Visa (Onshore)", defaultFee: "$4,200", template: "Standard Partner Retainer" },
      { subclass: "SC 189 / SC 190", title: "Skilled Independent / Nominated", defaultFee: "$2,800", template: "Points Test Service Agreement" },
      { subclass: "SC 482", title: "Temporary Skill Shortage", defaultFee: "$3,500", template: "Employer Sponsored Agreement" },
    ]
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#081B2E]">Visa Subclass Defaults</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Configure scope, professional fees, and defaults by Department of Home Affairs visa codes.</p>
          </div>
          <Button size="sm" className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
            <Plus className="h-4 w-4 mr-1" /> Add Matter Type
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100">
          {subclasses.map((item) => (
            <div key={item.subclass} className="grid gap-3 p-4 bg-white md:grid-cols-4 md:items-center">
              <div>
                <span className="text-xs font-bold text-[#0D9F8C]">{item.subclass}</span>
                <h4 className="text-sm font-bold text-[#081B2E] mt-0.5">{item.title}</h4>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Default Fee</span>
                {item.defaultFee}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Standard Template</span>
                {item.template}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-8.5 rounded-lg border-slate-200 px-3 text-[11px] font-bold hover:bg-slate-50">Edit defaults</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPaymentSchedules = () => {
    const schemes = [
      { name: "50-50 Standard Split", instalments: "2 Stages", distribution: "50% Upfront Retainer, 50% Lodgement Confirmation" },
      { name: "Three-Tier Milestones", instalments: "3 Stages", distribution: "30% Retainer, 40% Document Assembly, 30% Pre-Lodgement Review" },
      { name: "100% Upfront Professional Fees", instalments: "1 Stage", distribution: "100% Retainer paid prior to work commencement" },
    ]
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#081B2E]">Milestone Instalment Schemes</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Set up template billing structures to dynamically spread legal fee payments across matter milestones.</p>
          </div>
          <Button size="sm" className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
            <Plus className="h-4 w-4 mr-1" /> New Schedule
          </Button>
        </div>

        <div className="grid gap-4">
          {schemes.map((scheme) => (
            <div key={scheme.name} className="rounded-xl border border-slate-200/50 bg-white p-5 shadow-sm hover:border-slate-300 transition-all duration-200">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-bold text-[#081B2E]">{scheme.name}</h4>
                  <span className="mt-1 inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{scheme.instalments}</span>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed font-semibold">{scheme.distribution}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-lg hover:bg-slate-50">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-[#081B2E]">Security & Session Controls</h3>
        <p className="text-xs text-slate-400 mt-1 font-semibold">Configure multi-factor locks, audit visibility, and idle session auto-logouts.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 bg-white">
          <div>
            <h4 className="text-xs font-bold text-[#081B2E]">Multi-Factor Authentication (MFA)</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Enforce Google Authenticator or SMS token prompt at next sign-in for all RMAs.</p>
          </div>
          <div className="flex h-6 w-11 items-center rounded-full bg-[#0D9F8C] p-1 cursor-pointer">
            <div className="h-4 w-4 translate-x-5 rounded-full bg-white transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 bg-white">
          <div>
            <h4 className="text-xs font-bold text-[#081B2E]">Practitioner Inactivity Timeout</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Automatically sign out RMAs and administrators after period of idle time.</p>
          </div>
          <select className="flex h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]">
            <option value="15">15 Minutes</option>
            <option value="30">30 Minutes (Recommended)</option>
            <option value="60">1 Hour</option>
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-[#081B2E] mb-3">Active Practitioner Sessions</h4>
        <div className="rounded-xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100">
          {[
            { ip: "203.0.113.19", device: "Chrome on macOS (Sydney, AU)", time: "Current Session" },
            { ip: "203.0.113.82", device: "Safari on iOS (Melbourne, AU)", time: "Yesterday, 4:18 PM" },
          ].map((session) => (
            <div key={session.ip} className="flex justify-between p-4 bg-white text-xs">
              <div>
                <span className="font-mono font-bold text-slate-700">{session.ip}</span>
                <span className="text-slate-400 font-semibold ml-2">ΓÇó {session.device}</span>
              </div>
              <span className="font-bold text-[#0D9F8C]">{session.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDefaults = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        {["Default Agreement Validity", "Default Grace Period", "Notification Threshold", "Backup Frequency"].map((label, idx) => (
          <label key={label} className="grid gap-2 text-xs font-bold text-slate-500">
            {label}
            <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={["30 Days", "7 Days", "48 Hours", "Daily"][idx]} />
          </label>
        ))}
      </div>
      <Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Defaults</Button>
    </div>
  )

  const renderContent = () => {
    switch (section) {
      case "Agency Profile":
        return renderAgencyProfile()
      case "Team":
        return renderTeam()
      case "Branding":
        return renderBranding()
      case "Clauses":
        return renderClauses()
      case "Matter Types":
        return renderMatterTypes()
      case "Payment Schedules":
        return renderPaymentSchedules()
      case "Security":
        return renderSecurity()
      case "Defaults":
      default:
        return renderDefaults()
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Settings" title={section} description="Enterprise-grade configuration for your agency, team, templates, security and defaults." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit rounded-2xl border border-slate-200/50 bg-white/60 p-3 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-0 space-y-1">
            {items.map(([item, href]) => (
              <Link key={item} href={href} className={`flex rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${item === section ? "bg-[#0D9F8C] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item}</Link>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <h2 className="text-xl font-bold tracking-tight text-[#081B2E] mb-5">{section}</h2>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function BillingPage() {
  return (
    <div>
      <PageHeader eyebrow="Billing" title="Plan, usage and invoices" description="Stripe-inspired billing controls for current plan, payment methods, invoices and upgrade flows." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-50/10 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#0D9F8C]">Current plan</div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#081B2E]">Pro</h2>
                <p className="mt-2 text-sm text-slate-500 font-medium">$129/month. Unlimited agreements and team workflows.</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <Button className="mt-7 rounded-xl bg-[#0D9F8C] font-bold shadow-[0_8px_20px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]">Upgrade plan</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Usage</h2>
            {["Agreements", "Documents", "Team seats"].map((item, index) => (
              <div key={item} className="mt-4 first:mt-0">
                <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                  <span>{item}</span>
                  <span className="font-bold text-slate-700">{[78, 62, 44][index]}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0D9F8C]" style={{ width: `${[78, 62, 44][index]}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200/50 bg-white/60 overflow-hidden shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] divide-y divide-slate-100">
        {["INV-1048 - $129 - Paid", "INV-1047 - $129 - Paid", "INV-1046 - $129 - Paid"].map((invoice) => (
          <div key={invoice} className="flex items-center justify-between p-5 hover:bg-slate-50/40 transition-colors">
            <span className="font-bold text-sm text-[#081B2E]">{invoice}</span>
            <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold hover:bg-slate-50">Download</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
*/

export function SettingsPage({ section = "Agency Profile" }: { section?: string }) {
  const { 
    activeWorkspace, 
    simulatedRole, 
    user, 
    invitePractitioner, 
    updateWorkspaceBranding 
  } = useAuthStore()

  // Fallback defaults if hot reloads clear session
  const currentWorkspace = activeWorkspace || {
    name: "AVC Migration Partners",
    slug: "avc-migration",
    initials: "AM",
    color: "#0D9F8C",
    address: "Level 14, 175 Pitt Street, Sydney NSW 2000",
    marn: "1794016",
    abn: "45 128 349 820",
    team: [
      { name: "Rajwant Singh", role: "Principal RMA", marn: "MARN 1794016", status: "Active", email: "rajwant@avcmigration.com.au" }
    ]
  }

  const currentRole = simulatedRole || user?.role || "Owner"
  const currentSlug = currentWorkspace.slug

  // Settings navigation items split into Workspace and Personal
  const workspaceItems = [
    ["Agency Profile", "Agency Profile"],
    ["Branding", "Branding"],
    ["Team Setup", "Team"],
    ["Clauses Library", "Clauses"],
    ["Matter Defaults", "Matter Types"],
  ] as const

  const personalItems = [
    ["My Profile", "My Profile"],
    ["MFA Security", "Security"],
  ] as const

  // Global Float Toast State
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // 1. Team State & Invitation Modal
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteName, setInviteName] = React.useState("")
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteMarn, setInviteMarn] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("Migration Agent")
  const [inviteProgress, setInviteProgress] = React.useState(0)
  const [inviting, setInviting] = React.useState(false)

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return
    setInviting(true)
    setInviteProgress(0)

    const interval = setInterval(() => {
      setInviteProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setInviting(false)
          setIsInviteOpen(false)

          invitePractitioner(
            inviteName,
            inviteEmail,
            inviteRole,
            inviteMarn
          )

          triggerToast(`Workspace invitation sent to ${inviteName}!`)
          
          // Reset states
          setInviteName("")
          setInviteEmail("")
          setInviteMarn("")
          return 100
        }
        return prev + 25
      })
    }, 150)
  }

  // 2. Branding State
  const [brandColor, setBrandColor] = React.useState(currentWorkspace.color)
  const [brandInitials, setBrandInitials] = React.useState(currentWorkspace.initials)

  const handleSaveBranding = () => {
    updateWorkspaceBranding(brandColor, brandInitials)
    triggerToast("Workspace branding settings updated successfully!")
  }

  // Sync brand details if active workspace changes
  React.useEffect(() => {
    if (activeWorkspace) {
      setBrandColor(activeWorkspace.color)
      setBrandInitials(activeWorkspace.initials)
    }
  }, [activeWorkspace])

  // 3. Clauses State & Add Clause Modal
  interface ClauseItem {
    key: string
    title: string
    text: string
  }
  const [clausesList, setClausesList] = React.useState<ClauseItem[]>([
    { key: "CLAUSE-820-FEE", title: "Partner Visa Instalment Structure", text: "Specifies professional fees structured into 50% upfront retainer and 50% lodging milestone." },
    { key: "CLAUSE-OMARA-MANDATE", title: "OMARA Consumer Guide Mandate", text: "Explicitly references consumer rights, OMARA Code of Conduct, and client files access terms." },
    { key: "CLAUSE-REFUND-DISCLAIMER", title: "Lodgement Fee Refund Disclaimer", text: "Declares that Department of Home Affairs visa fees are strictly non-refundable upon lodgement." },
  ])
  const [isClauseOpen, setIsClauseOpen] = React.useState(false)
  const [clauseKey, setClauseKey] = React.useState("")
  const [clauseTitle, setClauseTitle] = React.useState("")
  const [clauseText, setClauseText] = React.useState("")

  const handleClauseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clauseKey || !clauseTitle || !clauseText) return

    const newClause: ClauseItem = {
      key: clauseKey.toUpperCase().replace(/\s+/g, "-"),
      title: clauseTitle,
      text: clauseText
    }
    setClausesList([newClause, ...clausesList])
    setIsClauseOpen(false)
    triggerToast(`Boilerplate clause ${newClause.key} added successfully!`)

    // Reset states
    setClauseKey("")
    setClauseTitle("")
    setClauseText("")
  }

  // 4. Security Settings State
  const [mfaEnabled, setMfaEnabled] = React.useState(true)
  const [mfaUpdating, setMfaUpdating] = React.useState(false)
  const [activeSessions, setActiveSessions] = React.useState([
    { ip: "203.0.113.19", device: "Chrome on macOS (Sydney, AU)", time: "Current Session", id: "sess-1" },
    { ip: "203.0.113.82", device: "Safari on iOS (Melbourne, AU)", time: "Yesterday, 4:18 PM", id: "sess-2" },
    { ip: "198.51.100.41", device: "Firefox on Windows (Brisbane, AU)", time: "3 days ago", id: "sess-3" },
  ])

  const handleMfaToggle = () => {
    setMfaUpdating(true)
    setTimeout(() => {
      setMfaEnabled(!mfaEnabled)
      setMfaUpdating(false)
      triggerToast(`MFA security enforcement has been ${!mfaEnabled ? "ENABLED" : "DISABLED"}!`)
    }, 500)
  }

  const revokeSession = (id: string, ip: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== id))
    triggerToast(`Session for IP ${ip} has been terminated successfully.`)
  }

  // Permissions lock warning check
  const isSettingsRestricted = currentRole === "Assistant" || currentRole === "Read-only staff"

  const renderAgencyProfile = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Business Name
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.name} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          ABN (Australian Business Number)
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.abn} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Principal MARN Registration
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.marn} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Office Address
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue={currentWorkspace.address} disabled={isSettingsRestricted} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Practice Timezone
          <select disabled={isSettingsRestricted} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]">
            <option value="AEST">Australian Eastern Standard Time (AEST) - Sydney</option>
            <option value="AWST">Australian Western Standard Time (AWST) - Perth</option>
            <option value="ACST">Australian Central Standard Time (ACST) - Adelaide</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Regulatory Authority Jurisdiction
          <Input className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" defaultValue="OMARA Australia" disabled />
        </label>
      </div>
      {!isSettingsRestricted && (
        <Button onClick={() => triggerToast("Agency profile details updated successfully!")} className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Profile</Button>
      )}
    </div>
  )

  const renderBranding = () => (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-700">
          <Palette className="h-3.5 w-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-700">Dynamic Workspace Theme Injection</h4>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
            Changing these branding details will immediately refresh the sidebar, primary button backgrounds, and avatar states across the active tenant session.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Active Corporate Accent Color
            <div className="flex items-center gap-3 mt-1">
              <span className="h-9 w-9 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-colors duration-300" style={{ backgroundColor: brandColor }}></span>
              <select 
                disabled={isSettingsRestricted} 
                value={brandColor} 
                onChange={(e) => setBrandColor(e.target.value)} 
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
              >
                <option value="#0D9F8C">Emerald Green (Compliance Default)</option>
                <option value="#2563EB">Sapphire Blue (Corporate Trust)</option>
                <option value="#D97706">Amber Gold (Advisory Premium)</option>
                <option value="#475569">Slate Gray (Minimalist Calm)</option>
              </select>
            </div>
          </label>

          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Workspace Initials (Sidebar Avatar)
            <Input 
              disabled={isSettingsRestricted} 
              maxLength={3} 
              value={brandInitials} 
              onChange={(e) => setBrandInitials(e.target.value)} 
              className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0D9F8C] uppercase font-bold"
            />
          </label>
        </div>

        <div className="space-y-4">
          <label className="grid gap-2 text-xs font-bold text-slate-500">
            Brand Preview (Live Simulation)
            <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center">
              <div 
                className="flex h-14 w-14 items-center justify-center rounded-full text-white text-lg font-black shadow-md transition-all duration-300 mb-3"
                style={{ backgroundColor: brandColor }}
              >
                {brandInitials || "IS"}
              </div>
              <div className="text-xs font-bold text-[#081B2E]">{currentWorkspace.name}</div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Tenant Subdomain: https://immisign.com/{currentSlug}</p>
            </div>
          </label>
        </div>
      </div>

      {!isSettingsRestricted && (
        <Button onClick={handleSaveBranding} className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Branding</Button>
      )}
    </div>
  )

  const renderTeamSetup = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#081B2E]">Workspace Team Members ({currentWorkspace.team ? currentWorkspace.team.length : 1})</h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Active OMARA practitioners and administrative seats.</p>
        </div>
        {!isSettingsRestricted && (
          <Button 
            onClick={() => setIsInviteOpen(true)}
            size="sm" 
            className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52] self-start"
          >
            <Plus className="h-4 w-4 mr-1" /> Invite Practitioner
          </Button>
        )}
      </div>

      {/* Team Table */}
      <div className="rounded-2xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100 bg-white">
        {currentWorkspace.team && currentWorkspace.team.map((member) => (
          <div key={member.email} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/50 transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div 
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: currentWorkspace.color }}
              >
                {member.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div className="text-sm font-bold text-[#081B2E] flex items-center gap-1.5">
                  {member.name}
                  {member.email === user?.email && (
                    <span className="rounded bg-slate-100 text-slate-500 px-1.5 py-0.5 text-[9px] font-bold">You</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{member.email} ΓÇó {member.marn}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{member.role}</span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div>
        <h4 className="text-xs font-bold text-[#081B2E] mb-3 uppercase tracking-wider">Role Permissions Matrix</h4>
        <div className="rounded-2xl border border-slate-200/50 overflow-hidden bg-white/40 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Capability</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Agent</th>
                  <th className="p-3 text-center">Case Admin</th>
                  <th className="p-3 text-center">Assistant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {[
                  ["Sign & Send Agreements", "Full Access", "Full Access", "Create only", "Draft only"],
                  ["Update Legal Templates", "Full Access", "RMA Approval", "View Only", "Locked"],
                  ["DHA/OMARA Audit Export", "Full Access", "RMA Specific", "Locked", "Locked"],
                  ["Workspace Branding", "Full Access", "View Only", "Locked", "Locked"],
                  ["Billing & Stripe Controls", "Full Access", "Locked", "Locked", "Locked"]
                ].map(([capability, owner, agent, manager, assistant]) => (
                  <tr key={capability} className="hover:bg-white/40 transition-colors">
                    <td className="p-3 font-bold text-[#081B2E]">{capability}</td>
                    <td className="p-3 text-center font-semibold text-emerald-600 bg-emerald-50/10">{owner}</td>
                    <td className="p-3 text-center font-semibold text-slate-500">{agent}</td>
                    <td className="p-3 text-center font-semibold text-slate-500">{manager}</td>
                    <td className="p-3 text-center font-semibold text-slate-400">{assistant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  const renderClauses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-[#081B2E]">Visa Clause Libraries ({clausesList.length})</h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Reusable legal boilerplate and terms to drag-and-drop into service agreements.</p>
        </div>
        {!isSettingsRestricted && (
          <Button 
            onClick={() => setIsClauseOpen(true)}
            size="sm" 
            className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Clause
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {clausesList.map((clause) => (
          <div key={clause.key} className="rounded-xl border border-slate-200/50 bg-white p-5 shadow-sm hover:border-slate-350/50 transition-all duration-200">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold text-[#0D9F8C] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">{clause.key}</span>
                <h4 className="text-sm font-bold text-[#081B2E]">{clause.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{clause.text}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-lg hover:bg-slate-50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderMatterTypes = () => {
    const subclasses = [
      { subclass: "SC 820 / SC 801", title: "Partner Visa (Onshore)", defaultFee: "$4,200", template: "Standard Partner Retainer" },
      { subclass: "SC 189 / SC 190", title: "Skilled Independent / Nominated", defaultFee: "$2,800", template: "Points Test Service Agreement" },
      { subclass: "SC 482", title: "Temporary Skill Shortage", defaultFee: "$3,500", template: "Employer Sponsored Agreement" },
    ]
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#081B2E]">Visa Subclass Defaults</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Configure scope, professional fees, and defaults by Department of Home Affairs visa codes.</p>
          </div>
          {!isSettingsRestricted && (
            <Button size="sm" className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
              <Plus className="h-4 w-4 mr-1" /> Add Matter Type
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100">
          {subclasses.map((item) => (
            <div key={item.subclass} className="grid gap-3 p-4 bg-white md:grid-cols-4 md:items-center">
              <div>
                <span className="text-xs font-bold text-[#0D9F8C]">{item.subclass}</span>
                <h4 className="text-sm font-bold text-[#081B2E] mt-0.5">{item.title}</h4>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Default Fee</span>
                {item.defaultFee}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Standard Template</span>
                {item.template}
              </div>
              <div className="flex justify-end">
                <Button disabled={isSettingsRestricted} variant="outline" size="sm" className="h-8.5 rounded-lg border-slate-200 px-3 text-[11px] font-bold hover:bg-slate-50">Edit defaults</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMyProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div 
          className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-black shadow"
          style={{ backgroundColor: currentWorkspace.color }}
        >
          {user?.avatar || "RS"}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#081B2E]">{user?.name || "Rajwant Singh"}</h4>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">{user?.email || "owner@demoagency.com"}</p>
          <span className="mt-2 inline-block rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#0D9F8C]">{currentRole}</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Full Name
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue={user?.name || "Rajwant Singh"} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Work Email
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue={user?.email || "owner@demoagency.com"} disabled />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Personal MARN (If applicable)
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue={user?.marn || "1794016"} />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Practitioner Phone
          <Input className="h-11 rounded-xl border-slate-200 bg-white" defaultValue="+61 2 9238 4810" />
        </label>
      </div>

      <Button onClick={() => triggerToast("Personal practitioner profile details updated successfully!")} className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52]">Save Profile</Button>
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 bg-white">
          <div>
            <h4 className="text-xs font-bold text-[#081B2E]">Multi-Factor Authentication (MFA)</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Enforce Google Authenticator or SMS token prompt at next sign-in for safety.</p>
          </div>
          <button 
            disabled={mfaUpdating}
            onClick={handleMfaToggle}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${mfaEnabled ? "bg-[#0D9F8C]" : "bg-slate-250"}`}
          >
            <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${mfaEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 bg-white">
          <div>
            <h4 className="text-xs font-bold text-[#081B2E]">Practitioner Inactivity Timeout</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Automatically sign out after period of idle time.</p>
          </div>
          <select className="flex h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]">
            <option value="15">15 Minutes</option>
            <option value="30">30 Minutes (Recommended)</option>
            <option value="60">1 Hour</option>
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-[#081B2E] mb-3">Active Practitioner Sessions</h4>
        <div className="rounded-xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100 bg-white">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex justify-between items-center p-4 text-xs gap-3">
              <div>
                <span className="font-mono font-bold text-slate-700">{session.ip}</span>
                <span className="text-slate-400 font-semibold ml-2 hidden sm:inline">ΓÇó {session.device}</span>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5 sm:hidden">{session.device}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-bold ${session.time === "Current Session" ? "text-[#0D9F8C]" : "text-slate-400"}`}>{session.time}</span>
                {session.time !== "Current Session" && (
                  <button 
                    onClick={() => revokeSession(session.id, session.ip)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (section) {
      case "Agency Profile":
        return renderAgencyProfile()
      case "Branding":
        return renderBranding()
      case "Team":
        return renderTeamSetup()
      case "Clauses":
        return renderClauses()
      case "Matter Types":
        return renderMatterTypes()
      case "My Profile":
        return renderMyProfile()
      case "Security":
        return renderSecurity()
      default:
        return renderAgencyProfile()
    }
  }

  return (
    <div className="relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#081B2E] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-4 w-4 text-[#0D9F8C]" />
          {toastMessage}
        </div>
      )}

      {/* Invite Practitioner Drawer Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Invite OMARA Practitioner</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Practitioner Full Name
              <Input 
                required
                value={inviteName} 
                onChange={(e) => setInviteName(e.target.value)} 
                className="h-11 rounded-xl border-slate-200 bg-white" 
                placeholder="e.g. Priya Mehta"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Work Email Address
              <Input 
                required
                type="email"
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
                className="h-11 rounded-xl border-slate-200 bg-white" 
                placeholder="e.g. priya@avcmigration.com.au"
              />
            </label>
            <div className="grid gap-4 grid-cols-2">
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                Practitioner Role
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)} 
                  className="flex h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="Migration Agent">Migration Agent</option>
                  <option value="Case Manager">Case Manager</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Read-only staff">Read-only staff</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                MARN Code (7-digits)
                <Input 
                  value={inviteMarn} 
                  onChange={(e) => setInviteMarn(e.target.value)} 
                  className="h-11 rounded-xl border-slate-200 bg-white" 
                  placeholder="e.g. 2189402"
                />
              </label>
            </div>

            {inviting && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-[#0D9F8C]">
                  <span>Provisioning secure license...</span>
                  <span>{inviteProgress}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#0D9F8C] transition-all duration-150" style={{ width: `${inviteProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button type="submit" disabled={inviting} className="rounded-xl h-11 text-xs font-bold bg-[#0D9F8C] hover:bg-[#0A5B52]">Send Invite Link</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Clause Drawer Dialog */}
      <Dialog open={isClauseOpen} onOpenChange={setIsClauseOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#081B2E] tracking-tight">Create Boileplate Clause</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClauseSubmit} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Library Code Key
              <Input 
                required
                value={clauseKey} 
                onChange={(e) => setClauseKey(e.target.value)} 
                className="h-11 rounded-xl border-slate-200 bg-white font-mono uppercase" 
                placeholder="e.g. CLAUSE-AUDIT-DISCLAIMER"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Display Title
              <Input 
                required
                value={clauseTitle} 
                onChange={(e) => setClauseTitle(e.target.value)} 
                className="h-11 rounded-xl border-slate-200 bg-white" 
                placeholder="e.g. 7-Year OMARA Custody Mandate"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Clause Boilerplate Text
              <textarea 
                required
                value={clauseText} 
                onChange={(e) => setClauseText(e.target.value)} 
                className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]" 
                placeholder="Enter the full legal wording of the clause..."
              />
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsClauseOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button type="submit" className="rounded-xl h-11 text-xs font-bold bg-[#0D9F8C] hover:bg-[#0A5B52]">Save to Library</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PageHeader eyebrow="Settings" title={section} description="Enterprise-grade configuration for your agency, team, templates, security and defaults." />
      
      {/* Role Restriction Banner */}
      {isSettingsRestricted && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-center gap-3 text-xs text-amber-800 font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Restricted Workspace View:</span> Your active simulated role is <span className="font-bold underline">{currentRole}</span>. Settings edits and team invites are locked. Switch to <span className="font-bold">Owner</span> or <span className="font-bold">Admin</span> in the sidebar simulator to test writing.
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Settings Navigation Sidebar */}
        <Card className="h-fit rounded-2xl border border-slate-200/50 bg-white/60 p-3 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-0 space-y-4">
            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workspace settings</div>
              <div className="space-y-1 mt-1">
                {workspaceItems.map(([item, target]) => (
                  <Link 
                    key={item} 
                    href={`/workspace/${currentSlug}/settings?section=${target}`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${item === section ? "bg-[#0D9F8C] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span>{item}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Personal settings</div>
              <div className="space-y-1 mt-1">
                {personalItems.map(([item, target]) => (
                  <Link 
                    key={item} 
                    href={`/workspace/${currentSlug}/settings?section=${target}`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${item === section ? "bg-[#0D9F8C] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span>{item}</span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Content Area */}
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-7">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">{section}</h2>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function BillingPage() {
  const { activeWorkspace, simulatedRole, user } = useAuthStore()
  const currentWorkspace = activeWorkspace || {
    name: "AVC Migration Partners",
    slug: "avc-migration",
    team: [{ name: "Rajwant Singh" }]
  }
  const currentRole = simulatedRole || user?.role || "Owner"
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

  const handleSeatUpgrade = (e: React.FormEvent) => {
    e.preventDefault()
    setUpgradingPlan(true)
    setTimeout(() => {
      setUpgradingPlan(false)
      setUpgradeSuccess(true)
      setTimeout(() => {
        setUpgradeSuccess(false)
        setIsUpgradeOpen(false)
        triggerToast(`Billing capacity expanded to ${newSeatCount} seats successfully!`)
      }, 1500)
    }, 2000)
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
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">New Monthly Total</span>
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

      <PageHeader eyebrow="Billing" title="Plan, usage and invoices" description="Stripe-inspired billing controls for current plan, payment methods, invoices and upgrade flows." />
      
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
                    <span className="bg-slate-100 rounded px-1.5 py-0.5 text-[10px] font-mono">VISA</span>
                    ΓÇóΓÇóΓÇóΓÇó ΓÇóΓÇóΓÇóΓÇó ΓÇóΓÇóΓÇóΓÇó 4242 (Expires 12/28)
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
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
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
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
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
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
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
              <span className="text-slate-400 font-medium ml-2">ΓÇó {invoice.date}</span>
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

export function TemplatesPage() {
  return (
    <div>
      <PageHeader eyebrow="Templates" title="Template management" description="Preview, duplicate, edit and organise approved agreement and document templates." action={<Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"><Plus className="h-4 w-4 mr-1" />New template</Button>} />
      <Toolbar placeholder="Search templates" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {["Partner Visa Agreement", "Skilled Migration Terms", "Parent Visa Pack", "Appeals Retainer", "Citizenship Checklist", "Client Onboarding"].map((template, index) => (
          <Card key={template} className="group rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(8,27,46,0.04)] hover:border-slate-350/50">
            <CardContent className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-5 group-hover:scale-105 transition-transform duration-300">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">{template}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-medium">Approved template with clause library and version history.</p>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                <span className="font-semibold">{index + 12} uses</span>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-8.5 rounded-lg border-slate-200 bg-white text-[11px] font-bold hover:bg-slate-50">Preview</Button>
                  <Button variant="outline" className="h-8.5 rounded-lg border-slate-200 bg-white text-[11px] font-bold hover:bg-slate-50">Duplicate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PlaceholderDashboardPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader eyebrow="ImmiSign" title={title} description="A production-ready workspace screen following the same premium enterprise SaaS system." />
      <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
        <CardContent className="p-10 text-center flex flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-5">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-slate-500 font-medium text-sm leading-6">This module is connected to the shared product shell and ready for deeper implementation.</p>
        </CardContent>
      </Card>
    </div>
  )
}
