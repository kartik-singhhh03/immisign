"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShieldCheck, FileText, ArrowRight, Lock, ChevronRight, Check } from "lucide-react"

import { ApplicationApproval } from "@/types/approval"
import { approvalService } from "@/lib/services/approvals.service"

export default function ClientReviewPortal() {
  const params = useParams()
  const router = useRouter()
  // token would normally be decoded to an approval ID. Using token as ID in this mock backend mode.
  const approvalId = params?.token as string
  
  const [approval, setApproval] = useState<ApplicationApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0) // 0=Welcome, 1=Security, 2=Overview, 3=Review, 4=Done
  const [securityCode, setSecurityCode] = useState("")

  // State mapped from approval
  const [checklist, setChecklist] = useState<any[]>([])
  
  useEffect(() => {
    loadApproval()
  }, [approvalId])

  const loadApproval = async () => {
    try {
      const data = await approvalService.getApproval(approvalId)
      if (data) {
        setApproval(data)
        setChecklist(data.checklist || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => setStep(prev => prev + 1)
  
  const handleVerifyToggle = async (id: string, currentlyChecked: boolean) => {
    setChecklist(checklist.map(c => c.id === id ? { ...c, checked: !currentlyChecked } : c))
    // Call service to log
    await approvalService.toggleChecklist(approvalId, id, !currentlyChecked, "client-mock-user", approval?.agency_id || "mock-agency");
  }

  const handleFinalApprove = async () => {
    await approvalService.updateStatus(approvalId, 'approved', "client-mock-user", approval?.agency_id || "mock-agency");
    setStep(4)
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading secure portal...</div>
  }

  if (!approval) {
    return <div className="p-12 text-center text-red-500 font-bold">Invalid or expired link.</div>
  }

  return (
    <div className="max-w-2xl mx-auto animate-enter">
      
      {/* ProgressBar */}
      {step > 0 && step < 4 && (
        <div className="mb-8 flex gap-1">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-[#0D9F8C]' : 'bg-slate-200'}`} />
          ))}
        </div>
      )}

      {step === 0 && (
        <Card className="border-slate-200/60 shadow-lg rounded-3xl overflow-hidden mt-12 text-center p-12 bg-white">
          <ShieldCheck className="mx-auto h-20 w-20 text-[#0D9F8C] mb-6" />
          <h1 className="text-3xl font-black text-slate-900 mb-2">Secure Application Review</h1>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
            You have been requested to review and approve <strong>{approval.title}</strong> for lodgement.
          </p>
          <Button onClick={handleNext} size="lg" className="w-full sm:w-auto bg-[#0D9F8C] hover:bg-[#0A5B52] font-bold text-lg rounded-xl h-14 px-8">
            Start Secure Review <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      )}

      {step === 1 && (
        <Card className="border-slate-200/60 shadow-lg rounded-3xl overflow-hidden mt-12 p-8 bg-white max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Security Verification</h2>
            <p className="text-slate-500 font-medium mt-2 text-sm">Please enter the 6-digit access code sent to your mobile device.</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              placeholder="000000"
              maxLength={6}
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[1em] font-mono text-3xl h-16 rounded-xl border-slate-300 bg-slate-50 focus:border-[#0D9F8C] focus:ring-[#0D9F8C]"
            />
            <Button onClick={async () => {
              await approvalService.updateStatus(approvalId, 'viewed', "client-mock-user", approval.agency_id);
              handleNext();
            }} disabled={securityCode.length < 6} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl">
              Verify Identity
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Application Overview</h2>
          <Card className="border-slate-200/60 rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="p-6">
               <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Matter Reference</div>
               <div className="text-lg font-bold text-slate-900">{approval.title}</div>
               {approval.description && <div className="text-sm font-medium text-slate-500 mt-2">{approval.description}</div>}
            </div>
            <div className="bg-slate-50 p-6 border-t border-slate-100">
               <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Documents to Review</div>
               <div className="space-y-2 text-sm font-medium text-slate-500">
                 (Document review integration coming soon via documentService)
               </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg" className="bg-[#0D9F8C] hover:bg-[#0A5B52] font-bold rounded-xl h-12 px-8">
              Review Declarations <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Required Declarations</h2>
          <p className="text-slate-500 font-medium">Please verify all required checklist items before final approval.</p>
          
          <div className="space-y-3">
             {checklist.map(item => (
                <div key={item.id} 
                  onClick={() => handleVerifyToggle(item.id, item.checked)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${item.checked ? 'border-[#0D9F8C] bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className={`mt-0.5 h-6 w-6 rounded-full shrink-0 flex items-center justify-center border-2 ${item.checked ? 'bg-[#0D9F8C] border-[#0D9F8C]' : 'border-slate-300'}`}>
                     {item.checked && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className={`font-semibold ${item.checked ? 'text-[#081B2E]' : 'text-slate-700'}`}>{item.label}</p>
                  </div>
                </div>
             ))}

             {checklist.length === 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                   No checklist items were attached.
                </div>
             )}
          </div>
          
          <div className="flex justify-end pt-4">
             <Button
               disabled={!checklist.every(c => c.checked) && checklist.length > 0} 
               onClick={handleFinalApprove} size="lg" className="bg-[#0D9F8C] hover:bg-[#0A5B52] font-bold rounded-xl h-12 px-8">
                Approve Application for Lodgement
             </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <Card className="border-emerald-200 shadow-xl shadow-emerald-500/10 rounded-3xl overflow-hidden mt-12 text-center p-12 bg-emerald-50">
          <div className="mx-auto h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Review Complete</h1>
          <p className="text-emerald-800 font-medium max-w-md mx-auto mb-8">
            Thank you. Your approval has been recorded in the audit trail. We will notify your migration agent that this application is ready for lodgement.
          </p>
          <Button onClick={() => window.close()} variant="outline" className="h-12 px-8 rounded-xl font-bold bg-white text-slate-700 border-none shadow-sm">
            Close Portal
          </Button>
        </Card>
      )}

    </div>
  )
}