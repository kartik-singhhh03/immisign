"use client"

import React from "react"
import Link from "next/link"
import { Search, Plus, MoreHorizontal, FileSignature, UploadCloud, Send, FileCheck2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
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

export function AgreementsList({ initialAgreements, agencySlug }: { initialAgreements: Agreement[], agencySlug: string }) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("All")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [previewAgreement, setPreviewAgreement] = React.useState<Agreement | null>(null)
  
  const itemsPerPage = 5

  const filteredAgreements = initialAgreements.filter((agreement) => {
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
    return initialAgreements.filter(a => a.status.toLowerCase() === status.toLowerCase()).length
  }

  const statPercentages = {
    Draft: (getStats("Draft") / initialAgreements.length) * 100 || 0,
    Sent: (getStats("Sent") / initialAgreements.length) * 100 || 0,
    Awaiting: (getStats("Awaiting") / initialAgreements.length) * 100 || 0,
    Signed: (getStats("Signed") / initialAgreements.length) * 100 || 0,
    Expired: (getStats("Expired") / initialAgreements.length) * 100 || 0,
  }

  return (
    <div className="animate-enter space-y-8">
      <PageHeader
        eyebrow="Agreements"
        title="Agreement workspace"
        description="Track every draft, sent agreement, pending signature and signed record from one premium table."
        action={
          <Button asChild className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]">
            <Link href={`/workspace/${agencySlug}/agreements/new`}>
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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search agreements by client name, matter description or ID..." 
            className="h-12 rounded-xl border-slate-200 bg-white pl-11 focus-visible:ring-1 focus-visible:ring-[#0D9F8C] placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", "Draft", "Sent", "Awaiting", "Signed", "Expired"].map((filter) => {
            const count = filter === "All" 
              ? initialAgreements.length 
              : initialAgreements.filter(a => a.status.toLowerCase() === filter.toLowerCase()).length
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
                  "px-1.5 py-0.5 rounded text-xs font-black transition-all",
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
        <div className="grid grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 max-lg:hidden">
          <div>Client</div>
          <div>Matter Description</div>
          <div>Professional Fee</div>
          <div>Signing Status</div>
          <div>Sent Date</div>
          <div />
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedAgreements.length > 0 ? (
            paginatedAgreements.map((agreement) => (
              <div
                key={agreement.id}
                className="group grid gap-3 px-6 py-5 transition-all duration-200 hover:bg-slate-50/40 lg:grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.9fr_0.3fr] lg:items-center"
              >
                <div onClick={() => setPreviewAgreement(agreement)} className="cursor-pointer">
                  <div className="font-bold text-[#081B2E] group-hover:text-[#0D9F8C] transition-colors">{agreement.client}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">{agreement.id} • {agreement.email}</div>
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
                      <DropdownMenuItem asChild className="rounded-lg font-semibold text-xs cursor-pointer p-2 focus:bg-slate-50">
                        <Link href={`/workspace/${agencySlug}/agreements/${agreement.id}`}>
                          Open Workspace
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem className="rounded-lg font-semibold text-xs cursor-pointer p-2 text-red-600 focus:bg-red-50 focus:text-red-700">
                        Archive Agreement
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
              <p className="text-xs text-slate-400 mt-1 font-semibold">Try modifying your search tags or create a new agreement.</p>
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
                <div className="text-xs text-slate-400 font-bold mt-1">ID: {previewAgreement.id} • Registered Custody File</div>
              </DialogHeader>

              <div className="space-y-6 text-xs text-[#081B2E]">
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
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0D9F8C] mb-2">1. Matter Scope of Representation</h4>
                  <p className="p-3 bg-slate-50/50 rounded-xl leading-relaxed text-slate-600 font-semibold border border-slate-100">
                    {previewAgreement.scope} All legal deliverables strictly adhere to the OMARA Migration Code of Conduct inside {previewAgreement.law}.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0D9F8C] mb-2">2. Compensation & Professional Fees</h4>
                  <div className="p-4 rounded-xl border border-slate-150 bg-white flex justify-between items-center font-bold">
                    <span className="text-slate-500 text-xs">Total Professional Fee</span>
                    <span className="text-[#0D9F8C] text-base">{previewAgreement.fee} AUD</span>
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
