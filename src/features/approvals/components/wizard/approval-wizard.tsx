"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ChevronLeft, FileText, UploadCloud, ShieldCheck, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createApprovalAction } from "@/features/approvals/actions/approvals"
import { Role } from "@/features/auth/types/roles"

export function ApprovalWizard({ agencyId, agencySlug, userId }: { agencyId: string, agencySlug: string, userId: string }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "Partner Visa Lodgement",
    visaSubclass: "Subclass 820",
    clientName: "Jaskaran Singh",
    clientEmail: "jaskaran@example.com",
    notes: ""
  })

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleFinish = async () => {
    try {
      setSaving(true)
      const role: Role = 'agency_admin' as any;
      
      // In a real application, the uploaded PDF would be passed as document_path.
      // Here we simulate the creation logic to trigger the Server Action.
      await createApprovalAction(agencyId, userId, role, {
        title: `${formData.title} - ${formData.clientName}`,
        visa_subclass: formData.visaSubclass,
        document_path: `${agencyId}/approvals/mock/original/application.pdf` // Mocked upload path
      })
      
      setDispatched(true)
    } catch (e) {
      console.error(e)
      alert("Failed to create approval request.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-enter max-w-4xl mx-auto py-8">
      {!dispatched && (
        <Link href={`/workspace/${agencySlug}/approvals`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Approvals
        </Link>
      )}
      
      {dispatched ? (
        <Card className="rounded-2xl border border-emerald-100 bg-[#f8fffd]/80 p-12 text-center shadow-[0_12px_40px_rgba(13,159,140,0.08)] mt-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-black text-[#081b36]">Approval Request Created!</h2>
          <p className="mt-4 text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            The application has been uploaded and secured. You can now send the review link to your client from the workspace.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild className="rounded-xl bg-[#0D9F8C] font-bold shadow-md hover:bg-[#0A5B52]">
              <Link href={`/workspace/${agencySlug}/approvals`}>View Approvals List</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900">New Lodgement Approval</h1>
            <p className="mt-2 text-slate-500 font-medium">Securely upload completed forms for client verification.</p>
          </div>

          <div className="flex gap-2 mb-8">
            {[1,2,3].map((s) => (
              <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-[#0D9F8C]' : 'bg-slate-200'}`} />
            ))}
          </div>

          <Card className="border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white">
            {step === 1 && (
              <div className="p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileText className="text-[#0D9F8C] h-5 w-5"/> Application Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Application Title</label>
                    <Input 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="bg-slate-50 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Visa Subclass</label>
                    <Input 
                      value={formData.visaSubclass} 
                      onChange={(e) => setFormData({...formData, visaSubclass: e.target.value})}
                      className="bg-slate-50 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Client Name</label>
                    <Input 
                      value={formData.clientName} 
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="bg-slate-50 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Client Email</label>
                    <Input 
                      value={formData.clientEmail} 
                      onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                      className="bg-slate-50 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UploadCloud className="text-[#0D9F8C] h-5 w-5"/> Document Upload</h2>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-bold text-slate-700 text-lg">Select application PDF</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Upload the final compiled PDF containing all forms and cover letters.</p>
                  <Button variant="outline" className="mt-6 font-bold rounded-xl border-slate-200">Browse Files</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-8 text-center py-16">
                 <ShieldCheck className="h-16 w-16 text-[#0D9F8C] mx-auto mb-4" />
                 <h2 className="text-2xl font-black mb-2">Ready to Secure</h2>
                 <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">The document will be securely stored in the compliance bucket and a unique review token will be generated.</p>
                 <Button 
                   disabled={saving} 
                   onClick={handleFinish} 
                   className="h-14 px-8 rounded-xl bg-[#081B2E] font-black text-white hover:bg-slate-800 shadow-[0_10px_24px_rgba(8,27,46,0.25)]"
                  >
                   {saving ? "Securing Document..." : "Create Approval Record"} <Send className="ml-2 h-4 w-4" />
                 </Button>
              </div>
            )}

            {step < 3 && (
              <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(step > 1 ? step - 1 : 1)} disabled={step === 1} className="font-bold">Back</Button>
                <Button onClick={handleNext} className="bg-[#0D9F8C] font-bold hover:bg-[#0A5B52] rounded-xl px-6 shadow-sm">
                  Next Step <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
