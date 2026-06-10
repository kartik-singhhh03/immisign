"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FileText, Upload } from "lucide-react"

type DraftApproval = {
  id: string
  approval_number?: string | null
  title: string
  status: string
}

export function ApplicationPreparationPanel({
  clientId,
  workspaceSlug,
  draftApprovals,
  loading,
}: {
  clientId: string
  workspaceSlug: string
  draftApprovals: DraftApproval[]
  loading?: boolean
}) {
  const prefix = `/workspace/${workspaceSlug}`

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 font-semibold animate-pulse">
        Loading preparation records…
      </div>
    )
  }

  if (!draftApprovals.length) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 text-slate-400" />}
        title="No application in preparation"
        description="Create a draft application approval, upload the package PDF, and complete the preparation checklist."
        action={
          <Button asChild size="sm" className="rounded-xl bg-[#111111] font-bold mt-2">
            <Link href={`${prefix}/approvals/new?clientId=${clientId}`}>Start preparation</Link>
          </Button>
        }
        className="min-h-[200px] border-slate-200/60 bg-white/50"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {draftApprovals.map((a) => (
        <li
          key={a.id}
          className="flex flex-wrap justify-between items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
        >
          <div>
            <div className="text-sm font-bold text-[#111111]">{a.approval_number || a.title}</div>
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
              <Upload className="h-3 w-3" /> Draft — upload documents and complete checklist
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold">
            <Link href={`${prefix}/approvals/${a.id}`}>Continue preparation</Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}
