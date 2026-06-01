"use client"

import React, { useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Plus, MoreHorizontal, FileCheck2 } from "lucide-react"

export function ApprovalsList({ initialApprovals, agencySlug }: { initialApprovals: any[], agencySlug: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  
  const filteredApprovals = initialApprovals.filter((approval) => {
    return approval.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           approval.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           approval.visaSubclass.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="animate-enter space-y-6">
      <PageHeader 
        eyebrow="Workflow"
        title="Application Approvals"
        description="Secure visa lodgement approvals and verification workflows."
        action={
          <Link href={`/workspace/${agencySlug}/approvals/new`}>
            <Button className="rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]">
              <Plus className="mr-2 h-4 w-4" />
              New Approval Request
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client or ID..." 
            className="h-10 rounded-xl border-slate-200 bg-white/70 pl-11 focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
          />
        </div>
        <Button variant="outline" className="h-10 rounded-xl bg-white/70">
          <Filter className="mr-2 h-4 w-4 text-slate-500" />
          Filter
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.3fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <div>Client & Application</div>
          <div>Agent</div>
          <div>Status</div>
          <div>Deadline</div>
          <div></div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredApprovals.length > 0 ? filteredApprovals.map((approval) => (
            <Link 
              href={`/workspace/${agencySlug}/approvals/${approval.id}`}
              key={approval.id} 
              className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.3fr] items-center px-6 py-4 hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-[#0D9F8C] transition-colors">{approval.clientName}</div>
                <div className="text-xs font-semibold text-slate-500">{approval.visaSubclass} • {approval.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {approval.agentName.charAt(0)}
                </div>
                <span className="text-sm font-medium text-slate-700">{approval.agentName}</span>
              </div>
              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${
                  approval.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  approval.status === 'pending_review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  approval.status === 'changes_requested' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {approval.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-slate-500 font-medium">
                {approval.lodgementDeadline ? new Date(approval.lodgementDeadline).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-900">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </Link>
          )) : (
            <div className="p-12 text-center text-slate-500">
              <FileCheck2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-900">No application approvals found</p>
              <p className="text-sm mt-1">Create an approval request to securely share a Visa application.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
