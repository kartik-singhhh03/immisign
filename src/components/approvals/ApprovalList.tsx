"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useApprovals } from "@/lib/hooks/useSupabaseData"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Plus, FileCheck2, Clock } from "lucide-react"

export function ApprovalList() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { slug } = useRequireWorkspace()
  const { data: approvals, loading, refetch } = useApprovals()
  const role = user?.role

  if (!slug) {
    return <div className="p-8 text-center text-slate-500">Loading workspace...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#081B2E]">Application Approvals</h1>
          <p className="text-slate-500 mt-1">Manage and track client application reviews securely.</p>
        </div>

        {(role === 'Owner' || role === 'Admin' || role === 'Migration Agent') && (
          <Button
            onClick={() => router.push(`/workspace/${slug}/application-approvals/new`)}
            className="bg-[#0D9F8C] hover:bg-[#0A8F7E] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Approval
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-slate-500">Loading approvals...</div>
      ) : !approvals?.length ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <FileCheck2 className="h-6 w-6 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No active approvals</h3>
            <p className="text-slate-500 max-w-sm mt-2">Create an approval request to gather documents and declarations before lodgement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval: any) => (
            <Card
              key={approval.id}
              onClick={() => router.push(`/workspace/${slug}/application-approvals/${approval.id}`)}
              className="cursor-pointer hover:border-[#0D9F8C]/50 transition-colors"
            >
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">{approval.client || approval.title}</h4>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> {approval.date || 'Recently updated'}
                  </p>
                </div>
                <Badge variant="outline">{approval.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
