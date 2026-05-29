"use client"

import React, { useEffect, useState } from "react"
import { ApplicationApproval } from "@/types/approval"
import { approvalService } from "@/lib/services/approvals.service"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Plus, Search, FileCheck2, Clock, CheckCircle2 } from "lucide-react"

import { useRouter } from "next/navigation"

export function ApprovalList() {
  const router = useRouter()
  const { activeWorkspace, user, simulatedRole } = useAuthStore()
  const role = simulatedRole || user?.role
  
  const [approvals, setApprovals] = useState<ApplicationApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeWorkspace) {
      loadApprovals()
    }
  }, [activeWorkspace])

  const loadApprovals = async () => {
    setLoading(true)
    try {
      const data = await approvalService.listAgencyApprovals(activeWorkspace!.id)
      setApprovals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!activeWorkspace || !user) return;
    await approvalService.createApproval({
      agency_id: activeWorkspace.id,
      title: "New Student Visa Application",
      description: "Review required for SC 500",
      status: "draft",
      checklist: [
        { id: "c1", label: "Verify passport validity", checked: false, required: true },
        { id: "c2", label: "Confirm form 80 details", checked: false, required: true }
      ]
    }, user.id)
    loadApprovals()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#081B2E]">Application Approvals</h1>
          <p className="text-slate-500 mt-1">Manage and track client application reviews securely.</p>
        </div>
        
        {/* RBAC: Only Agent/Admin/Owner can create */}
        {(role === 'Owner' || role === 'Admin' || role === 'Migration Agent') && (
          <Button onClick={handleCreate} className="bg-[#0D9F8C] hover:bg-[#0A8F7E] text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Approval
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-slate-500">Loading approvals...</div>
      ) : approvals.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileCheck2 className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No active approvals</h3>
            <p className="text-slate-500 max-w-sm mt-2 mb-6">Create an approval request to gather documents and declarations before lodgement.</p>
            {(role === 'Owner' || role === 'Admin' || role === 'Migration Agent') && (
              <Button onClick={handleCreate} variant="outline" className="border-slate-200">
                Create First Approval
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {approvals.map(approval => (
            <Card key={approval.id} onClick={() => router.push(`/application-approvals/${approval.id}`)} className="cursor-pointer hover:border-[#0D9F8C]/50 transition-colors group">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#0D9F8C]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileCheck2 className="h-5 w-5 text-[#0D9F8C]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{approval.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                       <Clock className="h-3 w-3" /> Updated {format(new Date(approval.updated_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Badge variant="outline" className={`
                    ${approval.status === 'approved' || approval.status === 'ready_for_lodgement' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                    ${approval.status === 'draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : ''}
                    ${approval.status === 'internal_review' || approval.status === 'sent_to_client' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                  `}>
                    {approval.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  
                  <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-600">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
