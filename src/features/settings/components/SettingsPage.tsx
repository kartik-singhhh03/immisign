
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

export function SettingsPage({ section = "Agency Profile" }: { section?: string }) {
  const {
    activeWorkspace,
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

  const currentRole = user?.role || "Owner"
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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return
    setInviting(true)

    try {
      await invitePractitioner(
        inviteName,
        inviteEmail,
        inviteRole,
        inviteMarn
      )

      triggerToast(`Workspace invitation sent to ${inviteName}!`)
      setIsInviteOpen(false)
      setInviteName("")
      setInviteEmail("")
      setInviteMarn("")
    } catch (err: any) {
      triggerToast("Error: " + err.message)
    } finally {
      setInviting(false)
    }
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

  const handleMfaToggle = async () => {
    setMfaUpdating(true)
    try {
      setMfaEnabled(!mfaEnabled)
      triggerToast(`MFA security enforcement has been ${!mfaEnabled ? "ENABLED" : "DISABLED"}!`)
    } finally {
      setMfaUpdating(false)
    }
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
              <p className="text-xs text-slate-400 font-semibold mt-1">Tenant Subdomain: https://immisign.com/{currentSlug}</p>
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
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{member.email} • {member.marn}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{member.role}</span>
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
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                <span className="font-mono text-xs font-bold text-[#0D9F8C] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">{clause.key}</span>
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
                <span className="block text-xs text-slate-400 uppercase font-bold">Default Fee</span>
                {item.defaultFee}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                <span className="block text-xs text-slate-400 uppercase font-bold">Standard Template</span>
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
          <span className="mt-2 inline-block rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-bold text-[#0D9F8C]">{currentRole}</span>
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
                <span className="text-slate-400 font-semibold ml-2 hidden sm:inline">• {session.device}</span>
                <div className="text-xs text-slate-400 font-semibold mt-0.5 sm:hidden">{session.device}</div>
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
                <div className="flex justify-between text-xs font-bold text-[#0D9F8C]">
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
