"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store/authStore"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useApprovalStore } from "@/store/approvalStore"
import { useApprovals } from "@/lib/hooks/useSupabaseData"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Plus, Search, Filter, MoreHorizontal, FileCheck2, User, Clock, CheckCircle2, FileText, UploadCloud, Settings, Send, LayoutList, Eye, Check, ChevronLeft, ShieldCheck, Mail
} from "lucide-react"
import { UploadManager } from "./UploadManager"
import { AuditTimeline } from "./AuditTimeline"
import { ApprovalPermissions } from "@/lib/permissions/approvals"

export function ApplicationApprovalsHomePage() {
  const { slug: currentSlug, agencyId: currentId } = useRequireWorkspace()
  
  const { data: approvals, loading: isLoading } = useApprovals()

  if (!currentSlug) {
    return <div className="p-8 text-center text-slate-500">Loading workspace...</div>
  }

  return (
    <div className="animate-enter">
      <PageHeader 
        eyebrow="Workflow"
        title="Application Approvals"
        description="Secure visa lodgement approvals and verification workflows."
        action={
          <Link href={`/workspace/${currentSlug}/application-approvals/new`}>
            <Button className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">
              <Plus className="mr-2 h-4 w-4" />
              New Approval Request
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search client or ID..." className="h-10 rounded-xl border-slate-200 bg-white/70 pl-11 focus-visible:ring-1 focus-visible:ring-[#111111]" />
        </div>
        <Button variant="outline" className="h-10 rounded-xl bg-white/70">
          <Filter className="mr-2 h-4 w-4 text-slate-500" />
          Filter
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {isLoading && <div className="p-4 text-center text-sm text-slate-500">Loading approvals...</div>}
        {!isLoading && (
        <>
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.3fr] border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <div>Client & Application</div>
          <div>Agent</div>
          <div>Status</div>
          <div>Deadline</div>
          <div></div>
        </div>
        <div className="divide-y divide-slate-100">
          {approvals?.map((approval: any) => (
            <Link 
              href={`/workspace/${currentSlug}/application-approvals/${approval.id}`}
              key={approval.id} 
              className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.3fr] items-center px-6 py-4 hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-[#111111] transition-colors">{approval.client}</div>
                <div className="text-xs font-semibold text-slate-500">{approval.type} • {approval.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  A
                </div>
                <span className="text-sm font-medium text-slate-700">Assigned Agent</span>
              </div>
              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${
                  approval.status === 'approved' ? 'bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]' :
                  approval.status === 'under_review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {approval.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-slate-500 font-medium">
                {approval.date}
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-900">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </Link>
          ))}
          {approvals?.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <FileCheck2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-900">No application approvals yet</p>
              <p className="text-sm mt-1">Create an approval request to securely share a Visa application for client verification.</p>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}

export function NewApplicationApprovalPage() {
  const { slug: currentSlug, agencyId: currentId } = useRequireWorkspace()
  const createApproval = useApprovalStore((state) => state.createApproval)
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    title: "",
    visaSubclass: "",
    clientName: "",
    clientEmail: "",
    agentName: "",
    lodgementDeadline: "",
    notes: ""
  })

  if (!currentSlug || !currentId) {
    return <div className="p-8 text-center text-slate-500">Loading workspace...</div>
  }

  // Simulated handle create
  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleFinish = async () => {
    if (!currentId) return
    await createApproval(currentId, formData)
    window.location.href = `/workspace/${currentSlug}/application-approvals`
  }

  return (
    <div className="animate-enter max-w-4xl mx-auto py-8">
      <Link href={`/workspace/${currentSlug}/application-approvals`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Approvals
      </Link>
      
      <PageHeader
        variant="wizard"
        eyebrow="Workflow"
        title="New Lodgement Approval"
        description="Configure secure client verification and approval for lodgement."
      />

      <div className="flex gap-2 mb-8">
        {[1,2,3,4].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-[#111111]' : 'bg-slate-200'}`} />
        ))}
      </div>

      <Card className="border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileText className="text-[#111111] h-5 w-5"/> Application Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Application Title</label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Partner Visa Lodgement" 
                  className="bg-slate-50 h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Visa Subclass</label>
                <Input 
                  value={formData.visaSubclass} 
                  onChange={(e) => setFormData({...formData, visaSubclass: e.target.value})}
                  placeholder="e.g. Subclass 820" 
                  className="bg-slate-50 h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Client Name</label>
                <Input 
                  value={formData.clientName} 
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  placeholder="John Doe" 
                  className="bg-slate-50 h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Client Email</label>
                <Input 
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                  placeholder="client@email.com" 
                  className="bg-slate-50 h-12 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UploadCloud className="text-[#111111] h-5 w-5"/> Document Upload</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 text-lg">Drag & drop application documents</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Upload forms, statutory declarations, and cover letters that require client review.</p>
              <Button variant="outline" className="mt-6 font-bold">Browse Files</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="text-[#111111] h-5 w-5"/> Client Verification Requirements</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="mt-1"><Check className="h-5 w-5 text-[#111111]"/></div>
                <div>
                  <h4 className="font-bold text-slate-900">Personal Details Confirmation</h4>
                  <p className="text-sm text-slate-500 leading-tight mt-1">Client must verify passport, address, and contact details are correct in the final forms.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="mt-1"><Check className="h-5 w-5 text-[#111111]"/></div>
                <div>
                  <h4 className="font-bold text-slate-900">Lodgement Authorization Declaration</h4>
                  <p className="text-sm text-slate-500 leading-tight mt-1">Client declares they authorize the migration agency to submit the application to the Department of Home Affairs.</p>
                </div>
              </div>
              <Button variant="ghost" className="text-[#111111] font-bold"><Plus className="mr-2 h-4 w-4"/> Add Custom Declaration</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-8 text-center">
             <ShieldCheck className="h-16 w-16 text-[#111111] mx-auto mb-4" />
             <h2 className="text-2xl font-black mb-2">Ready to Send for Approval</h2>
             <p className="text-slate-500 max-w-md mx-auto mb-8">A secure link will be emailed to {formData.clientEmail || 'the client'}. They will be guided through a verified review experience to authorize the lodgement.</p>
          </div>
        )}

        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setStep(step > 1 ? step - 1 : 1)} disabled={step === 1}>Back</Button>
          {step < 4 ? (
            <Button onClick={handleNext} className="bg-[#111111] font-bold hover:bg-[#222222]">Next Step <ChevronLeft className="ml-2 h-4 w-4 rotate-180" /></Button>
          ) : (
            <Button onClick={handleFinish} className="bg-[#111111] font-bold hover:bg-[#222222]">Send for Approval <Send className="ml-2 h-4 w-4" /></Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export function ApplicationApprovalDetailPage({ id }: { id: string }) {
  const user = useAuthStore((state) => state.user)
  const { slug: currentSlug } = useRequireWorkspace()
  
  const { data: approvals, loading: isLoading } = useApprovals()
  const approval = approvals?.find((a: any) => a.id === id) || null;

  if (!currentSlug) return <div className="p-8 text-center text-slate-500">Loading workspace...</div>
  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading details...</div>
  if (!approval) return <div className="p-8 text-center text-slate-500 font-bold">Approval not found.</div>

  const isApproved = approval.status === 'Approved'

  // Calculate stats
  const verificationChecklist = approval.verificationChecklist || []
  const totalVerifications = verificationChecklist.length
  const completedVerifications = verificationChecklist.filter((v: any) => v.isCompleted).length
  const verifiedPercentage = totalVerifications > 0 ? Math.round((completedVerifications / totalVerifications) * 100) : 0
  
  const documents = approval.documents || []
  const auditEvents = approval.auditEvents || []

  return (
    <div className="animate-enter max-w-5xl mx-auto py-8">
      <Link href={`/workspace/${currentSlug}/application-approvals`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Approvals
      </Link>
      
      <PageHeader
        eyebrow="Application Approval"
        title={approval.client}
        description={`${approval.title} • ${approval.type} • ${approval.id}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${
              isApproved ? "bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]" :
              approval.status === "under_review" || approval.status === "Pending Review" ? "bg-amber-50 text-amber-700 border border-amber-200" :
              "bg-[#FAFAFA] text-[#5C5C5C] border border-[#E7E7E7]"
            }`}>
              {approval.status.replace("_", " ").toUpperCase()}
            </span>
            <Button variant="outline" className="font-bold border-slate-200">
              <Mail className="mr-2 h-4 w-4 text-slate-400" /> Reminder
            </Button>
            {!isApproved && (
              <Button className="bg-[#111111] text-white font-bold hover:bg-[#222222]">
                <Eye className="mr-2 h-4 w-4" /> View Portal
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-[#111111]"/> Application Documents
              </h2>
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{(doc.size / 1024 / 1024).toFixed(2)} MB • PDF</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[#111111] font-bold text-xs uppercase tracking-wider">Preview</Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">No documents uploaded.</div>
                )}
              </div>
              
              {user && ApprovalPermissions.canUploadDocuments(user.role) && !isApproved && (
                <div className="mt-6">
                  <UploadManager approvalId={approval.id} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-[#111111]"/> Client Verification
                </h2>
                <span className="text-sm font-bold text-[#5C5C5C] bg-[#FAFAFA] px-2.5 py-1 rounded-lg border border-[#E7E7E7]">
                  {verifiedPercentage}% Completed
                </span>
              </div>
              <div className="space-y-3">
                {verificationChecklist.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl bg-white">
                    <div className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${item.isCompleted ? 'bg-[#111111] text-white' : 'bg-slate-100 border border-slate-200 text-transparent'}`}>
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${item.isCompleted ? 'text-slate-900' : 'text-slate-700'}`}>{item.label}</p>
                      {item.isCompleted && item.completedAt && (
                        <p className="text-xs text-slate-500 mt-1 font-medium">Verified on {new Date(item.completedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/60 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50">
            <CardContent className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Approval Details</h2>
              <div className="space-y-4 text-sm font-medium">
                <div>
                  <div className="text-slate-500 text-xs uppercase mb-1">Assigned Agent</div>
                  <div className="text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> {approval.agentName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase mb-1">Created</div>
                  <div className="text-slate-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" /> {approval.created_at ? new Date(approval.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                {approval.lodgementDeadline && (
                  <div>
                    <div className="text-slate-500 text-xs uppercase mb-1">Lodgement Deadline</div>
                    <div className="text-amber-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" /> {new Date(approval.lodgementDeadline).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Audit Trail</h2>
              {auditEvents.length > 0 ? (
                <AuditTimeline events={auditEvents} />
              ) : (
                <div className="text-sm text-slate-500">No events logged yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

