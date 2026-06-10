"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import type { ComplianceFilterKey } from "@/features/compliance/types"
import { useClients } from "@/lib/hooks/useSupabaseData"
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
import { PhoneInput } from "@/components/ui/phone-input"
import { parseOrThrow } from "@/lib/validations/fields"
import { clientCreateSchema } from "@/lib/validations/schemas"
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
import { PageEmptyState } from "@/components/ui/standards"
import { notifyError, notifySuccess } from "@/lib/ux/feedback"
import { PageHeader } from "@/components/ui/page-header"
import { TableSkeleton } from "@/components/ui/skeletons"
import { PaginationBar } from "@/components/ui/pagination-bar"

const COMPLIANCE_FILTER_LABELS: Partial<Record<ComplianceFilterKey, string>> = {
  missing_sa: "Missing Service Agreements",
  pending_approval: "Pending Approvals",
  awaiting_lodge: "Awaiting Lodgement",
  missing_sos: "Missing SOS",
  incomplete_matters: "Incomplete Matters",
}

const LEGACY_COMPLIANCE_REDIRECT: Record<string, ComplianceFilterKey> = {
  outstanding_docs: "incomplete_matters",
  unack_sos: "missing_sos",
  ready_lodge: "awaiting_lodge",
  completed: "incomplete_matters",
}

function ClientsPageContent() {
  const searchParams = useSearchParams()
  const rawCompliance = searchParams.get("compliance")
  const complianceFilter = (
    rawCompliance
      ? LEGACY_COMPLIANCE_REDIRECT[rawCompliance] || rawCompliance
      : null
  ) as ComplianceFilterKey | null
  const { slug: currentSlug } = useRequireWorkspace()
  const { addClient } = useClients()
  const [clientsList, setClientsList] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [totalCount, setTotalCount] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const pageSize = 10
  const [complianceClientIds, setComplianceClientIds] = React.useState<Set<string> | null>(null)
  const [complianceLoading, setComplianceLoading] = React.useState(false)
  
  // New Client Form States
  const [clientName, setClientName] = React.useState("")
  const [clientEmail, setClientEmail] = React.useState("")
  const [clientPhone, setClientPhone] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName || !clientEmail) return

    try {
      setIsSubmitting(true)
      const payload = parseOrThrow(clientCreateSchema, {
        name: clientName,
        email: clientEmail,
        phone: clientPhone || null,
      })
      await addClient(payload)
      
      setIsOpen(false)
      setClientName("")
      setClientEmail("")
      setClientPhone("")
      notifySuccess("Client created", `${clientName} was added to your workspace.`)
    } catch (err: any) {
      notifyError("Could not create client", err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sort: "created_at",
        direction: "desc",
      })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch(`/api/clients?${params}`)
      const json = await res.json()
      if (!cancelled && json.success) {
        setClientsList(json.data || [])
        setTotalCount(json.count || 0)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [page, debouncedSearch])

  React.useEffect(() => {
    if (!complianceFilter) {
      setComplianceClientIds(null)
      return
    }
    setComplianceLoading(true)
    fetch("/api/compliance/dashboard")
      .then((r) => r.json())
      .then((json) => {
        const card = json.dashboard?.summary?.find(
          (c: { id: string }) => c.id === complianceFilter,
        )
        const matterClientIds = (card?.matters || []).map((m: { clientId: string }) => m.clientId)
        setComplianceClientIds(
          new Set(matterClientIds.length ? matterClientIds : card?.clientIds || []),
        )
      })
      .catch(() => setComplianceClientIds(new Set()))
      .finally(() => setComplianceLoading(false))
  }, [complianceFilter])

  const filteredClients = (clientsList || []).filter((c: { id: string }) => {
    if (!complianceFilter || !complianceClientIds) return true
    return complianceClientIds.has(c.id)
  })
  const totalPages = Math.ceil(totalCount / pageSize) || 0

  return (
    <div>
      {complianceFilter && COMPLIANCE_FILTER_LABELS[complianceFilter] && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E7E7E7] bg-[#FAFAFA] px-4 py-3">
          <p className="text-sm text-[#232323]">
            <span className="font-semibold text-[#111111]">Compliance filter:</span>{" "}
            {COMPLIANCE_FILTER_LABELS[complianceFilter]}
            {complianceLoading ? " (loading…)" : ` · ${filteredClients.length} clients`}
          </p>
          <Link
            href={`/workspace/${currentSlug}/clients`}
            className="text-xs font-semibold text-[#6E6E6E] hover:text-[#111111]"
          >
            Clear filter
          </Link>
        </div>
      )}

      <PageHeader
        className="mb-6 animate-enter"
        eyebrow="Clients"
        title="Client relationship workspace"
        description="Premium CRM-style profiles connected to agreements, documents, notes and matter timelines."
        action={
          currentSlug ? (
            <Button asChild>
              <Link href={`/workspace/${currentSlug}/onboarding/new`}>
                <Plus className="h-4 w-4 mr-1.5" />New Client & Matter
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />New client
            </Button>
          )
        }
      />

      {/* SEARCH TOOLBAR */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name or email address..."
            className="h-12 rounded-2xl border-slate-200/50 bg-white/70 pl-11 shadow-[0_8px_20px_rgba(8,27,46,0.02)] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#111111]"
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl border-slate-200/60 bg-white/70 px-5 font-bold hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* CLIENTS GRID */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : clientsList?.length === 0 ? (
        <PageEmptyState module="clients" onAction={() => setIsOpen(true)} />
      ) : filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">No clients match your search.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client: any) => (
            <Link
              key={client.id}
              href={`/workspace/${currentSlug}/clients/${client.id}`}
              className="grid gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)] transition-all hover:bg-white/90 md:grid-cols-[1fr_0.8fr_0.6fr_0.6fr_auto] md:items-center"
            >
              <div>
                <div className="font-semibold text-[#111111]">{client.name}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {client.email}{client.phone ? ` · ${client.phone}` : ""}
                </div>
              </div>
              <div><StatusPill status={client.stage} /></div>
              <div className="text-sm font-semibold text-slate-650">
                {client.matters} {client.matters === 1 ? "matter" : "matters"}
              </div>
              <div className="text-sm font-semibold text-[#111111]">{client.value}</div>
              <ArrowRight className="h-4 w-4 text-slate-350 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {!loading && totalCount > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          className="mt-4 rounded-2xl border border-slate-200/50 bg-white/60"
        />
      )}

      {/* ADD CLIENT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6 bg-white/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">Register New Visa Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4 mt-3">
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Client Full Name
              <Input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. Manpreet Sodhi"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Email Address
              <Input
                required
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. manpreet@gmail.com"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-500">
              Phone Number
              <PhoneInput
                value={clientPhone}
                onChange={setClientPhone}
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold"
                placeholder="e.g. +61 400 000 000"
              />
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <Button disabled={isSubmitting} type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white">Cancel</Button>
              <Button disabled={isSubmitting} type="submit" className="rounded-xl h-11 text-xs font-bold bg-[#111111] hover:bg-[#222222]">
                {isSubmitting ? "Saving..." : "Save Client Profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ClientsPage() {
  return (
    <React.Suspense fallback={<TableSkeleton rows={5} cols={4} />}>
      <ClientsPageContent />
    </React.Suspense>
  )
}
