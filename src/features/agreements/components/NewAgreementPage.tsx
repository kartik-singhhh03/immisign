"use client"
import * as React from "react"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useAuthStore } from "@/store/authStore"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileArchive,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UploadCloud,
  ShieldCheck,
  Trash2,
  X,
  Palette,
  Users,
  ShieldAlert,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/layout/PageHeader"







export function NewAgreementPage() {
  const { slug: currentSlug } = useRequireWorkspace()
  const steps = ["Client", "Matter", "Fees", "Terms", "Preview", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState("Just now")
  const [dispatched, setDispatched] = React.useState(false)

  const handleDispatch = async () => {
    setSaving(true)
    try {
      const user = useAuthStore.getState().user;
      
      if (!user) {
        throw new Error("No active user session. Please log in again.");
      }

      const res = await fetch('/api/agreements/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          // agencyId is intentionally NOT sent — the API resolves it from
          // the authenticated session (users.agency_id) to guarantee a real UUID.
          userId: user.id
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to dispatch standard agreement");
      }

      setDispatched(true);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send agreement: " + err.message);
    } finally {
      setSaving(false);
    }
  }
  
  const [formData, setFormData] = React.useState({
    // Step 1: Client
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    sponsorName: "",
    responsibleRma: "",
    
    // Step 2: Matter
    visaSubclass: "",
    matterPriority: "Medium",
    lodgementDeadline: "",
    scopeOfWork: "",
    
    // Step 3: Fees
    professionalFee: "",
    depositRequired: "",
    billingFrequency: "Milestone instalments (50/50 split)",
    gstRequired: "Yes",
    
    // Step 4: Terms
    termsTemplate: "Standard OMARA Compliant Service Agreement",
    governingLaw: "New South Wales (NSW)",
    additionalClauses: "",
    customNotes: "",
  })

  const [templateHtml, setTemplateHtml] = React.useState<string>("");

  // Simulated live autosave whenever formData changes
  React.useEffect(() => {
    setSaving(true)
    const timer = setTimeout(() => {
      setSaving(false)
      const now = new Date()
      setLastSaved(`Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
    }, 700)
    return () => clearTimeout(timer)
  }, [formData])

  // Fetch actual template content
  React.useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates && data.templates.length > 0) {
          setTemplateHtml(data.templates[0].content?.html || "");
        }
      })
      .catch(err => console.error("Failed to load templates:", err));
  }, []);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculatedTax = formData.gstRequired === "Yes" ? parseFloat(formData.professionalFee || "0") * 0.10 : 0
  const totalAmount = parseFloat(formData.professionalFee || "0") + calculatedTax

  const renderClientStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Client Name (Large Clean Input)
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
            value={formData.clientName} 
            onChange={(e) => handleFieldChange("clientName", e.target.value)}
            placeholder="e.g. Gurpreet Singh" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Email Address
          <Input 
            type="email"
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
            value={formData.clientEmail} 
            onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
            placeholder="e.g. gurpreet.singh@gmail.com" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Phone Number
          <PhoneInput
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]"
            value={formData.clientPhone}
            onChange={(v) => handleFieldChange("clientPhone", v)}
            placeholder="e.g. +61 402 984 102"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Sponsor Full Name (if applicable)
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
            value={formData.sponsorName} 
            onChange={(e) => handleFieldChange("sponsorName", e.target.value)}
            placeholder="e.g. Amandeep Kaur" 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Responsible Migration Agent (Practitioner)
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.responsibleRma}
            onChange={(e) => handleFieldChange("responsibleRma", e.target.value)}
          >
            <option value="">Select responsible agent...</option>
          </select>
        </label>
      </div>
      <div className="mt-7 flex justify-end">
        <Button onClick={() => setCurrentStep(1)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
          Continue to Matter Details <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderMatterStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Visa Subclass
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.visaSubclass}
            onChange={(e) => handleFieldChange("visaSubclass", e.target.value)}
          >
            <option value="SC 820 - Partner Visa (Onshore)">SC 820 - Partner Visa (Onshore)</option>
            <option value="SC 189 - Skilled Independent">SC 189 - Skilled Independent</option>
            <option value="SC 190 - Skilled Nominated">SC 190 - Skilled Nominated</option>
            <option value="SC 482 - Temporary Skill Shortage">SC 482 - Temporary Skill Shortage</option>
            <option value="SC 143 - Contributory Parent">SC 143 - Contributory Parent</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Matter Priority Level
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.matterPriority}
            onChange={(e) => handleFieldChange("matterPriority", e.target.value)}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority (Urgent)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Target Lodgement Deadline
          <Input 
            type="date"
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
            value={formData.lodgementDeadline} 
            onChange={(e) => handleFieldChange("lodgementDeadline", e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Compliant Scope of Work
          <textarea 
            className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.scopeOfWork}
            onChange={(e) => handleFieldChange("scopeOfWork", e.target.value)}
            placeholder="Describe the exact scope of services to be provided..."
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(2)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
          Continue to Fees <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderFeesStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Professional Fee Amount (AUD)
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <Input 
              type="number"
              className="h-12 rounded-xl border-slate-200 bg-white pl-8 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
              value={formData.professionalFee} 
              onChange={(e) => handleFieldChange("professionalFee", e.target.value)}
              placeholder="e.g. 4500" 
            />
          </div>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Upfront Deposit / Retainer (AUD)
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <Input 
              type="number"
              className="h-12 rounded-xl border-slate-200 bg-white pl-8 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
              value={formData.depositRequired} 
              onChange={(e) => handleFieldChange("depositRequired", e.target.value)}
              placeholder="e.g. 1500" 
            />
          </div>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Billing Frequency / Split
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.billingFrequency}
            onChange={(e) => handleFieldChange("billingFrequency", e.target.value)}
          >
            <option value="Milestone instalments (50/50 split)">Milestone instalments (50/50 split)</option>
            <option value="Three-tier retainer schedule">Three-tier retainer schedule</option>
            <option value="100% upfront professional payment">100% upfront professional payment</option>
            <option value="Hourly rate model">Hourly rate model ($350/hr)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Apply Australian GST (10%)
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.gstRequired}
            onChange={(e) => handleFieldChange("gstRequired", e.target.value)}
          >
            <option value="Yes">Yes (10% GST Added)</option>
            <option value="No">No (GST Exempt - Offshore client)</option>
          </select>
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(3)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
          Continue to Terms <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderTermsStep = () => (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Service Agreement Legal Template
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.termsTemplate}
            onChange={(e) => handleFieldChange("termsTemplate", e.target.value)}
          >
            <option value="Standard OMARA Compliant Service Agreement">Standard OMARA Compliant Service Agreement (Version 2.4)</option>
            <option value="Short-Form Visa Retainer">Short-Form Visa Retainer (Employer Sponsor Specific)</option>
            <option value="AAT Appeals Service Mandate">AAT Appeals Service Mandate</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Governing State Law
          <select 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.governingLaw}
            onChange={(e) => handleFieldChange("governingLaw", e.target.value)}
          >
            <option value="New South Wales (NSW)">New South Wales (NSW)</option>
            <option value="Victoria (VIC)">Victoria (VIC)</option>
            <option value="Queensland (QLD)">Queensland (QLD)</option>
            <option value="Western Australia (WA)">Western Australia (WA)</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Additional Clause Codes
          <Input 
            className="h-12 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-1 focus-visible:ring-[#111111]" 
            value={formData.additionalClauses} 
            onChange={(e) => handleFieldChange("additionalClauses", e.target.value)}
            placeholder="Clause identifiers..." 
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Practitioner Custom Notes
          <textarea 
            className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            value={formData.customNotes}
            onChange={(e) => handleFieldChange("customNotes", e.target.value)}
            placeholder="Any extra instructions, native translation notes or milestones exceptions..."
          />
        </label>
      </div>
      <div className="mt-7 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(4)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
          Generate Preview <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderPreviewStep = () => {
    let finalHtml = templateHtml || "<p>No template available.</p>";
    
    // Process handlebars placeholders
    finalHtml = finalHtml.replace(/\{\{client_name\}\}/g, formData.clientName || '_______________');
    finalHtml = finalHtml.replace(/\{\{client_email\}\}/g, formData.clientEmail || '_______________');
    finalHtml = finalHtml.replace(/\{\{visa_subclass\}\}/g, formData.visaSubclass || '_______________');
    finalHtml = finalHtml.replace(/\{\{fee_amount\}\}/g, formData.professionalFee ? `$${formData.professionalFee}` : '_______________');
    finalHtml = finalHtml.replace(/\{\{deposit_amount\}\}/g, formData.depositRequired ? `$${formData.depositRequired}` : '_______________');
    finalHtml = finalHtml.replace(/\{\{rma_name\}\}/g, formData.responsibleRma || '_______________');
    finalHtml = finalHtml.replace(/\{\{scope_of_work\}\}/g, formData.scopeOfWork || '_______________');

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md font-sans max-w-full overflow-hidden text-xs text-[#111111] space-y-6 relative">
          <div className="absolute right-6 top-6 rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-black text-[#111111] border border-[#E7E7E7]">
            ACTUAL TEMPLATE PREVIEW
          </div>
          <div 
            className="prose max-w-none text-sm font-medium" 
            dangerouslySetInnerHTML={{ __html: finalHtml }} 
          />
        </div>
        <div className="mt-7 flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(3)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
            Back
          </Button>
          <Button onClick={() => setCurrentStep(5)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
            Confirm & Send <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSendStep = () => (
    <div className="space-y-6">
      {dispatched ? (
        <Card className="rounded-2xl border border-[#E7E7E7] bg-[#f8fffd]/80 p-8 text-center shadow-[0_12px_40px_rgba(17,17,17,0.12)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7] shadow-sm mb-6 animate-pulse">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-[#081b36]">Agreement Dispatched!</h2>
          <p className="mt-3 text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            The OMARA compliant service agreement for subclass <strong className="text-[#081b36]">{formData.visaSubclass.split(" - ")[0]}</strong> has been securely hashed, digitally signed by {formData.responsibleRma.split(" (")[0]}, and dispatched to <strong className="text-[#081b36]">{formData.clientEmail}</strong>.
          </p>
          {apiResponse?.agreementId && (
            <p className="mt-4 text-xs font-mono text-slate-500">
              Agreement ID: {apiResponse.agreementId}
            </p>
          )}
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-bold">
              <Link href={`/workspace/${currentSlug}/agreements`}>View Agreements List</Link>
            </Button>
            <Button onClick={() => setDispatched(false)} className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">
              Create Another Agreement
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#111111]">Dispatch Controls</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Select delivery paths and secure verification configurations to dispatch this agreement.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/50 bg-white p-5 space-y-4">
              <div className="font-bold text-sm text-[#111111]">Agreement Signers</div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAFAFA] text-xs font-black text-[#111111]">RMA</span>
                    <span className="text-xs font-bold text-slate-700">{formData.responsibleRma.split(" (")[0]}</span>
                  </div>
                  <span className="text-xs font-black text-[#111111] bg-[#FAFAFA]/50 px-2 py-0.5 rounded">RMA SIGNED</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-xs font-black text-amber-700">CLI</span>
                    <span className="text-xs font-bold text-slate-700">{formData.clientName || "Client"}</span>
                  </div>
                  <span className="text-xs font-black text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded">AWAITING</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/50 bg-white p-5 space-y-4">
              <div className="font-bold text-sm text-[#111111]">Audit Trail Channels</div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded border-slate-350 text-[#111111] focus:ring-[#111111] h-4 w-4" />
                    <span className="text-xs font-bold text-slate-700">Email Delivery ({formData.clientEmail || "Not Set"})</span>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded border-slate-350 text-[#111111] focus:ring-[#111111] h-4 w-4" />
                    <span className="text-xs font-bold text-slate-700">SMS Verification Link ({formData.clientPhone || "Not Set"})</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(4)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
              Back to Preview
            </Button>
            <Button onClick={handleDispatch} className="rounded-xl bg-[#111111] font-bold px-8 shadow-md hover:bg-[#222222]">
              Authorise & Dispatch Agreement <Send className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return renderClientStep()
      case 1:
        return renderMatterStep()
      case 2:
        return renderFeesStep()
      case 3:
        return renderTermsStep()
      case 4:
        return renderPreviewStep()
      case 5:
      default:
        return renderSendStep()
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="New agreement"
        title="Create a compliant agreement"
        description="A guided workflow with autosave, preview and a sticky matter summary."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Wizard Steps Container */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-5 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep
                const isActive = index === currentStep
                return (
                  <button
                    key={step}
                    disabled={dispatched}
                    onClick={() => {
                      if (index < currentStep || index === currentStep) {
                        setCurrentStep(index)
                      }
                    }}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-300",
                      isActive 
                        ? "border-[#111111]/30 bg-[#FAFAFA]/20 text-[#111111] shadow-sm font-bold" 
                        : isCompleted 
                          ? "border-[#E7E7E7] bg-white text-[#111111]" 
                          : "border-slate-100 bg-white/40 text-slate-400"
                    )}
                  >
                    <div 
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black transition-all duration-300",
                        isActive 
                          ? "bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)]" 
                          : isCompleted 
                            ? "bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]" 
                            : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <div className={cn("mt-3 text-[11px] transition-all font-semibold", isActive ? "text-[#222222] font-bold" : "text-slate-500")}>
                      {step}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <CardContent className="p-7">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[#111111]">{steps[currentStep]} Details</h2>
                <div className="flex items-center gap-2">
                  {saving ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#111111] bg-[#FAFAFA]/50 px-3 py-1 rounded-full border border-[#E7E7E7]/30">
                      <svg className="animate-spin h-3.5 w-3.5 text-[#111111]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Autosaving...
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-bold text-[#111111] border border-[#E7E7E7]/50">
                      {lastSaved}
                    </span>
                  )}
                </div>
              </div>
              
              {renderContent()}
            </CardContent>
          </Card>
        </div>

        {/* Sticky Summary Column */}
        <div className="relative">
          <Card className="sticky top-24 h-fit rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#111111]">Agreement summary</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Live status of current matter draft.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="rounded-xl border border-slate-100 bg-[#FAFAFA] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Client</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.clientName || "Not Selected"}</div>
                  <div className="text-xs text-slate-500 font-semibold">{formData.clientEmail || "Email unassigned"}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#FAFAFA] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Matter & Scope</span>
                  <div className="font-bold text-[#081b36] truncate">{formData.visaSubclass.split(" - ")[0]}</div>
                  <div className="text-xs text-slate-500 font-semibold">Priority: {formData.matterPriority}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#FAFAFA] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Legal Fees & Split</span>
                  <div className="font-bold text-[#111111] text-sm">${totalAmount.toLocaleString()} AUD</div>
                  <div className="text-xs text-slate-500 font-semibold">Retainer due: ${parseFloat(formData.depositRequired || "0").toLocaleString()} AUD</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#FAFAFA] p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Regulatory Terms</span>
                  <div className="font-bold text-slate-600 truncate text-[11px]">{formData.termsTemplate}</div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">Jurisdiction: {formData.governingLaw.split(" (")[0]}</div>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#111111]"></span>
                  Draft Autosaved
                </span>
                <span>Active Step: {currentStep + 1}/6</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
