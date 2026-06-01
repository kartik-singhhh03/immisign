"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"

export function AgreementWizard({ agencyId, agencySlug, userId }: { agencyId: string, agencySlug: string, userId: string }) {
  const router = useRouter()
  const steps = ["Client", "Matter", "Fees", "Terms", "Preview", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [dispatched, setDispatched] = React.useState(false)
  const [loadingStep, setLoadingStep] = React.useState(0)
  const [apiResponse, setApiResponse] = React.useState<any>(null)
  const [apiError, setApiError] = React.useState<string | null>(null)
  
  const [formData, setFormData] = React.useState({
    clientName: "Gurpreet Singh",
    clientEmail: "gurpreet.singh@gmail.com",
    clientPhone: "+61 402 984 102",
    sponsorName: "Amandeep Kaur",
    responsibleRma: "Rajwant Singh (MARN 1794016)",
    visaSubclass: "SC 820 - Partner Visa (Onshore)",
    matterPriority: "High",
    lodgementDeadline: "2026-10-15",
    scopeOfWork: "Comprehensive onshore Partner Visa representation.",
    professionalFee: "4500",
    depositRequired: "1500",
    billingFrequency: "Milestone instalments (50/50 split)",
    gstRequired: "Yes",
    termsTemplate: "Standard OMARA Compliant Service Agreement",
    governingLaw: "New South Wales (NSW)",
    additionalClauses: "CLAUSE-OMARA-MANDATE",
    customNotes: "",
  })

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    try {
      setSaving(true)
      setApiError(null)
      setLoadingStep(0)

      const payload = {
        agencyId,
        userId,
        formData: {
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientPhone: formData.clientPhone,
          sponsorName: formData.sponsorName,
          responsibleRma: formData.responsibleRma,
          visaSubclass: formData.visaSubclass,
          matterPriority: formData.matterPriority,
          lodgementDeadline: formData.lodgementDeadline,
          scopeOfWork: formData.scopeOfWork,
          professionalFee: formData.professionalFee,
          depositRequired: formData.depositRequired,
          billingFrequency: formData.billingFrequency,
          gstRequired: formData.gstRequired,
          termsTemplate: formData.termsTemplate,
          governingLaw: formData.governingLaw,
          additionalClauses: formData.additionalClauses,
          customNotes: formData.customNotes,
        }
      }
      
      const res = await fetch('/api/agreements/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "Generation pipeline failed")
      }

      setLoadingStep(5)
      setApiResponse(data)
      setDispatched(true)
    } catch (e: any) {
      console.error(e)
      setApiError(e.message || "Failed to generate and dispatch agreement.")
    } finally {
      setSaving(false)
    }
  }

  const calculatedTax = formData.gstRequired === "Yes" ? parseFloat(formData.professionalFee || "0") * 0.10 : 0
  const totalAmount = parseFloat(formData.professionalFee || "0") + calculatedTax

  const renderClientStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Client Name (Large Clean Input)
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.clientName} 
            onChange={(e) => handleFieldChange("clientName", e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Email Address
          <Input 
            type="email"
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.clientEmail} 
            onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
          />
        </label>
      </div>
      <div className="mt-7 flex justify-end">
        <Button onClick={() => setCurrentStep(1)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">
          Continue to Matter Details <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderMatterStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Compliant Scope of Work
          <textarea 
            className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.scopeOfWork}
            onChange={(e) => handleFieldChange("scopeOfWork", e.target.value)}
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} className="rounded-xl border-slate-200 bg-white font-bold px-6">Back</Button>
        <Button onClick={() => setCurrentStep(2)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">Continue to Fees <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
      </div>
    </div>
  )

  const renderFeesStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Professional Fee Amount (AUD)
          <Input 
            type="number"
            className="h-12 rounded-xl border-slate-200 bg-white pl-8 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#0D9F8C]" 
            value={formData.professionalFee} 
            onChange={(e) => handleFieldChange("professionalFee", e.target.value)}
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl border-slate-200 bg-white font-bold px-6">Back</Button>
        <Button onClick={() => setCurrentStep(3)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">Continue to Terms <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
      </div>
    </div>
  )

  const renderTermsStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Practitioner Custom Notes
          <textarea 
            className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
            value={formData.customNotes}
            onChange={(e) => handleFieldChange("customNotes", e.target.value)}
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-xl border-slate-200 bg-white font-bold px-6">Back</Button>
        <Button onClick={() => setCurrentStep(4)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">Generate Preview <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md font-sans max-w-full overflow-hidden text-xs text-[#081B2E] space-y-6 relative">
        <div className="absolute right-6 top-6 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0D9F8C] border border-emerald-100">
          DRAFT PREVIEW
        </div>
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <div className="text-sm font-black text-[#081b36] tracking-tight">ImmiSign Legal-Tech Document</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Client: {formData.clientName}</div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">1. Scope of Registered Services</h4>
          <p className="leading-relaxed font-semibold text-slate-600">{formData.scopeOfWork}</p>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C] border-b border-slate-100 pb-2 mb-3">2. Professional Fees</h4>
          <div className="flex justify-between p-3 bg-slate-50/50 font-semibold">
            <span className="text-slate-500">Base Professional Fee</span>
            <span className="text-[#081B2E]">${parseFloat(formData.professionalFee || "0").toLocaleString()} AUD</span>
          </div>
        </div>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(3)} className="rounded-xl border-slate-200 bg-white font-bold px-6">Back</Button>
        <Button onClick={() => setCurrentStep(5)} className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52]">Proceed to Dispatches <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
      </div>
    </div>
  )

  const renderSendStep = () => {
    const stepsList = [
      "Creating agreement record in cloud database",
      "Compiling standard template and generating PDF",
      "Uploading document PDF to secure cloud storage",
      "Writing activity history and transaction logs",
      "Dispatching signature request via SignWell"
    ]

    if (saving) {
      return (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center space-y-2 mb-6">
            <h3 className="text-lg font-bold text-[#081B2E]">Executing Backend Pipeline</h3>
            <p className="text-xs text-slate-400 font-semibold">Please wait while our cloud microservices compile and secure your document.</p>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            {stepsList.map((step, index) => {
              const isDone = loadingStep > index
              const isActive = loadingStep === index
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black border transition-all duration-300",
                    isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                    isActive ? "bg-amber-500 border-amber-500 text-white animate-pulse" :
                    "bg-slate-50 border-slate-200 text-slate-300"
                  )}>
                    {isDone ? "✓" : index + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-semibold tracking-tight transition-all duration-300",
                    isDone ? "text-emerald-600 line-through decoration-emerald-200" :
                    isActive ? "text-slate-900 font-bold" :
                    "text-slate-400"
                  )}>
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="pt-4 flex justify-center">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden max-w-md">
              <div 
                className="h-full bg-[#0D9F8C] transition-all duration-500" 
                style={{ width: `${(loadingStep / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )
    }

    if (dispatched && apiResponse) {
      const { agreementId, result, signwellResult } = apiResponse
      return (
        <Card className="rounded-2xl border border-emerald-100 bg-[#f8fffd]/80 p-8 shadow-[0_12px_40px_rgba(13,159,140,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm mb-6">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-[#081b36] text-center">Agreement Dispatched!</h2>
          <p className="mt-3 text-slate-600 font-medium max-w-md mx-auto leading-relaxed text-center">
            The standard agreement has been successfully compiled, uploaded, and pushed for legal signatures.
          </p>

          <div className="mt-8 border-y border-emerald-100/50 py-6 space-y-4 text-xs font-semibold text-slate-600">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-bold">AGREEMENT ID:</span>
              <span className="col-span-2 text-slate-800 font-mono select-all bg-white/60 px-2 py-0.5 rounded border border-emerald-50">{agreementId}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-bold">STORAGE PATH:</span>
              <span className="col-span-2 text-slate-800 font-mono select-all bg-white/60 px-2 py-0.5 rounded border border-emerald-50 truncate" title={result?.storagePath}>{result?.storagePath}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-bold">SIGNWELL ID:</span>
              <span className="col-span-2 text-slate-800 font-mono select-all bg-white/60 px-2 py-0.5 rounded border border-emerald-50">{signwellResult?.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-bold">STATUS:</span>
              <span className="col-span-2 text-emerald-700 uppercase bg-emerald-100/60 px-2.5 py-0.5 rounded-full border border-emerald-200/50 w-fit text-xs font-black">{signwellResult?.status}</span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/90 border border-emerald-100/30 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9F8C]">Active Signature Links</h4>
            <div className="space-y-3">
              {signwellResult?.recipients?.map((rec: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{rec.name}</span>
                    <span className="text-xs text-slate-400 font-semibold">{rec.email}</span>
                  </div>
                  {rec.signing_url ? (
                    <Button asChild size="sm" className="rounded-lg bg-[#0D9F8C] hover:bg-[#0A5B52] text-xs font-black text-white">
                      <a href={rec.signing_url} target="_blank" rel="noopener noreferrer">Sign Document</a>
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sent via email</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-bold shadow-sm">
              <Link href={`/workspace/${agencySlug}/agreements`}>View Agreements List</Link>
            </Button>
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#081B2E]">Dispatch Controls</h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Finalize and trigger the Server Action to create the agreement.</p>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold leading-relaxed">
            <span className="font-black uppercase block tracking-wider mb-1 text-rose-700">Pipeline Execution Error</span>
            {apiError}
          </div>
        )}

        <Button disabled={saving} onClick={handleGenerate} className="w-full h-14 rounded-xl bg-[#081B2E] font-black text-white hover:bg-slate-800 shadow-[0_10px_24px_rgba(8,27,46,0.25)]">
          Generate & Dispatch Agreement
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-enter space-y-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="New Record"
        title="Agreement digital wizard"
        description="Compile compliant professional service agreements seamlessly."
      />
      
      {!dispatched && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 md:gap-4 w-full justify-between items-center px-4">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black transition-colors",
                  currentStep > idx ? "bg-[#0D9F8C] text-white" : currentStep === idx ? "bg-[#081B2E] text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {idx + 1}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider hidden sm:block",
                  currentStep >= idx ? "text-[#081B2E]" : "text-slate-400"
                )}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="rounded-[1.35rem] border-white/70 shadow-sm relative overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="p-8">
          {currentStep === 0 && renderClientStep()}
          {currentStep === 1 && renderMatterStep()}
          {currentStep === 2 && renderFeesStep()}
          {currentStep === 3 && renderTermsStep()}
          {currentStep === 4 && renderPreviewStep()}
          {currentStep === 5 && renderSendStep()}
        </div>
      </Card>
    </div>
  )
}
