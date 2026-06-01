"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ApplicationApproval, ApprovalAuditEvent } from "@/types/approval"
import { approvalService } from "@/lib/services/approvals.service"
import { auditRepository } from "@/lib/repositories/mock/approval-audit.repository"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowLeft, Clock, History, FileCheck2, Share, ShieldCheck, Check } from "lucide-react"

export default function ApprovalDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const { activeWorkspace, user } = useAuthStore()
  const [approval, setApproval] = useState<ApplicationApproval | null>(null)
  const [events, setEvents] = useState<ApprovalAuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeWorkspace) {
      loadData()
    }
  }, [activeWorkspace, id])

  const loadData = async () => {
    try {
      const app = await approvalService.getApproval(id)
      setApproval(app)
      if (app) {
        const adt = await auditRepository.listByApplication(id)
        setEvents(adt)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendToClient = async () => {
    if (!approval || !user || !activeWorkspace) return
    await approvalService.updateStatus(approval.id, 'sent_to_client', user.id, activeWorkspace.id)
    alert(`Mock email sent to client. Client portal link: /client/review/${approval.id}`)
    loadData()
  }

  if (loading) return <div className="p-8">Loading approval workflow...</div>
  if (!approval) return <div className="p-8">Approval not found.</div>

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/application-approvals')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#081B2E]">{approval.title}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{approval.id}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className={`text-sm px-3 py-1 bg-slate-50`}>
            {approval.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
          {approval.status === 'draft' && (
            <Button onClick={handleSendToClient} className="bg-[#0D9F8C] hover:bg-[#0A8F7E]">
              <Share className="h-4 w-4 mr-2" /> Request Client Review
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-[#0D9F8C]" /> Requirements
               </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-4">
                  {approval.checklist.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">No requirements added yet.</div>
                  ) : (
                    approval.checklist.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border-2 ${item.checked ? 'bg-[#0D9F8C] border-[#0D9F8C]' : 'border-slate-300'}`}>
                          {item.checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full">Manage Checklist</Button>
             </CardContent>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileCheck2 className="h-5 w-5 text-[#0D9F8C]" /> Documents
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-slate-500 text-sm italic">Document abstract layer coming soon.</div>
             </CardContent>
           </Card>
        </div>

        <div className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <History className="h-5 w-5 text-slate-400" /> Audit Timeline
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-6">
                 {events.length === 0 ? (
                   <div className="text-slate-500 text-sm italic">No events recorded.</div>
                 ) : (
                   events.map(event => (
                     <div key={event.id} className="relative pl-6 border-l border-slate-200 last:border-0 last:pb-0 pb-6">
                       <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-slate-200 border-2 border-white" />
                       <div className="text-sm font-semibold text-slate-700">{event.action.replace(/_/g, ' ')}</div>
                       <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         {format(new Date(event.createdAt), "MMM d, h:mm a")}
                       </div>
                       {event.metadata && (
                         <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-600">
                           {JSON.stringify(event.metadata)}
                         </div>
                       )}
                     </div>
                   ))
                 )}
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}