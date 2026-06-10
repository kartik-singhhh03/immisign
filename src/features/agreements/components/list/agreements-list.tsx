"use client"

import React from "react"
import Link from "next/link"
import { Search, Plus, MoreHorizontal, FileSignature, UploadCloud, Send, FileCheck2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
import { PageEmptyState } from "@/components/ui/standards"
import { StatusPill } from "@/components/saas/dashboard-pages" // Reuse the styling pill
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { getRealAgencyId } from "@/lib/hooks/useSupabaseData"
import { createClient } from "@/lib/supabase/client"
import { archiveAgreementAction } from "@/features/agreements/actions/agreements"
import { Role } from "@/features/auth/types/roles"
import { notifyError, notifySuccess } from "@/lib/ux/feedback"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { TableSkeleton } from "@/components/ui/skeletons"

interface Agreement {
  /** Database UUID for navigation and mutations. */
  agreementUuid: string
  id: string
  ref?: string
  client: string
  email: string
  matter: string
  fee: string
  status: string
  date: string
  scope: string
  law: string
}

export function AgreementsList({ agencySlug }: { agencySlug: string }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const [agreements, setAgreements] = React.useState<Agreement[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("All")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [previewAgreement, setPreviewAgreement] = React.useState<Agreement | null>(null)
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const pageSize = 10

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, activeFilter])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sort: "created_at",
        direction: "desc",
      })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (activeFilter !== "All") params.set("status", activeFilter.toLowerCase())
      const res = await fetch(`/api/agreements?${params}`, { credentials: "include" })
      const json = await res.json()
      if (!cancelled && json.success) {
        setAgreements(json.data || [])
        setTotalCount(json.count || 0)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [currentPage, debouncedSearch, activeFilter])

  const workspaceHref = (agreement: Agreement) =>
    `/workspace/${agencySlug}/agreements/${agreement.agreementUuid || agreement.id}`

  const openWorkspace = (agreement: Agreement) => {
    router.push(workspaceHref(agreement))
  }

  const handleArchive = async (agreement: Agreement) => {
    if (!user?.id || !activeWorkspace?.id) return
    if (!window.confirm("Archive this agreement? It will be removed from active lists.")) return
    const targetId = agreement.agreementUuid || agreement.id
    try {
      setArchivingId(targetId)
      const supabase = createClient()
      const agencyId = await getRealAgencyId(supabase, activeWorkspace.id)
      if (!agencyId) throw new Error("Workspace agency could not be resolved.")
      await archiveAgreementAction(
        agencyId,
        user.id,
        (user.role || "Read-only staff") as Role,
        targetId,
      )
      notifySuccess("Agreement archived", "The agreement was archived.")
      setAgreements((prev) => prev.filter((a) => (a.agreementUuid || a.id) !== targetId))
      setTotalCount((c) => Math.max(0, c - 1))
    } catch (e: unknown) {
      notifyError("Archive failed", e instanceof Error ? e.message : "Could not archive")
    } finally {
      setArchivingId(null)
    }
  }
  
  const totalPages = Math.ceil(totalCount / pageSize) || 0

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  if (!loading && totalCount === 0 && !debouncedSearch && activeFilter === "All") {
    return (
      <div className="animate-enter space-y-8">
        <PageHeader
          eyebrow="Service Agreements"
          title="Service agreements"
          description="MARA-compliant agreements sent for electronic signature."
        />
        <PageEmptyState
          module="agreements"
          actionHref={`/workspace/${agencySlug}/agreements/new`}
        />
      </div>
    )
  }

  return (
    <div className="animate-enter space-y-8">
      <PageHeader
        eyebrow="Service Agreements"
        title="Agreement workspace"
        description="Track every draft, sent agreement, pending signature and signed record from one premium table."
        action={
          <Button asChild className="rounded-xl bg-[#111111] font-bold shadow-[0_10px_24px_rgba(17,17,17,0.12)] hover:bg-[#222222]">
            <Link href={`/workspace/${agencySlug}/agreements/new`}>
              <Plus className="h-4 w-4 mr-1.5" /> New Agreement
            </Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-200/50 bg-white/60 px-5 py-4 text-sm font-semibold text-slate-600">
        {totalCount} agreement{totalCount === 1 ? "" : "s"} in workspace
        {activeFilter !== "All" ? ` · filtered by ${activeFilter}` : ""}
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search agreements by client name, matter description or ID..." 
            className="h-12 rounded-xl border-slate-200 bg-white pl-11 focus-visible:ring-1 focus-visible:ring-[#111111] placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", "Draft", "Sent", "Awaiting", "Signed", "Expired"].map((filter) => {
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
                    ? "bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)]" 
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60"
                )}
              >
                {filter}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 max-lg:hidden">
          <div>Client</div>
          <div>Matter Description</div>
          <div>Professional Fee</div>
          <div>Signing Status</div>
          <div>Sent Date</div>
          <div />
        </div>

        <div className="divide-y divide-slate-100">
          {agreements.length > 0 ? (
            agreements.map((agreement) => (
              <div
                key={agreement.id}
                className="group grid gap-3 px-6 py-5 transition-all duration-200 hover:bg-slate-50/40 lg:grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] lg:items-center"
              >
                <div onClick={() => setPreviewAgreement(agreement)} className="cursor-pointer">
                  <div className="font-bold text-[#111111] group-hover:text-[#111111] transition-colors">{agreement.client}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">{agreement.ref || agreement.id} • {agreement.email}</div>
                </div>
                <div onClick={() => setPreviewAgreement(agreement)} className="text-xs font-bold text-slate-600 cursor-pointer">{agreement.matter}</div>
                <div className="text-sm font-bold text-[#111111]">{agreement.fee}</div>
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
                      <DropdownMenuItem
                        className="rounded-lg font-semibold text-xs cursor-pointer p-2 focus:bg-slate-50"
                        onClick={() => openWorkspace(agreement)}
                      >
                        Open Workspace
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem
                        disabled={archivingId === (agreement.agreementUuid || agreement.id)}
                        onClick={() => handleArchive(agreement)}
                        className="rounded-lg font-semibold text-xs cursor-pointer p-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                      >
                        {archivingId === (agreement.agreementUuid || agreement.id) ? "Archiving…" : "Archive Agreement"}
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
              <h3 className="text-base font-bold text-[#111111]">No agreements found</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Try modifying your search tags or create a new agreement.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {!loading && totalCount > 0 && (
        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          total={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Previews Modal */}
      <Dialog open={!!previewAgreement} onOpenChange={(open) => !open && setPreviewAgreement(null)}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 shadow-2xl p-7 rounded-2xl max-h-[85vh] overflow-y-auto">
          {previewAgreement && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                <DialogTitle className="text-lg font-black text-[#111111]">Agreement Digital Record</DialogTitle>
                <div className="text-xs text-slate-400 font-bold mt-1">Ref: {previewAgreement.ref || previewAgreement.id}</div>
              </DialogHeader>

              <div className="space-y-6 text-xs text-[#111111]">
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Signing Stage</span>
                    <div className="mt-1 font-bold text-sm text-[#081b36]">{previewAgreement.status === "Signed" ? "Fully Executed" : "Awaiting Client Seal"}</div>
                  </div>
                  <StatusPill status={previewAgreement.status} />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="p-4 rounded-xl border border-slate-100 space-y-1 bg-white">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Client Signer</span>
                    <div className="font-bold text-sm text-slate-800">{previewAgreement.client}</div>
                    <div className="text-xs text-slate-400 font-semibold">{previewAgreement.email}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 space-y-1 bg-white">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Matter Description</span>
                    <div className="font-bold text-sm text-slate-800">{previewAgreement.matter.split(" - ")[0]}</div>
                    <div className="text-xs text-slate-400 font-semibold">Subclass Code: {previewAgreement.matter.split(" - ")[1] || "N/A"}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111] mb-2">1. Matter Scope of Representation</h4>
                  <p className="p-3 bg-slate-50/50 rounded-xl leading-relaxed text-slate-600 font-semibold border border-slate-100">
                    {previewAgreement.scope} All legal deliverables strictly adhere to the OMARA Migration Code of Conduct inside {previewAgreement.law}.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111] mb-2">2. Compensation & Professional Fees</h4>
                  <div className="p-4 rounded-xl border border-slate-150 bg-white flex justify-between items-center font-bold">
                    <span className="text-slate-500 text-xs">Total Professional Fee</span>
                    <span className="text-[#111111] text-base">{previewAgreement.fee} AUD</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
