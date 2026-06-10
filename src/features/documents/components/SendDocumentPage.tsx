"use client"
import * as React from "react"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useAuthStore } from "@/store/authStore"
import { useDocuments, getRealAgencyId } from "@/lib/hooks/useSupabaseData"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  ArrowRight,
  FileCheck2,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  UploadCloud,
  ShieldCheck,
  Trash2,
  Check,
  FileSignature,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { DispatchTimeline, withGlobalTask } from "@/components/ui/standards"
import { ProfessionalErrorPanel } from "@/components/errors/professional-error"
import { notifyError, notifySuccess } from "@/lib/ux/feedback"
import { filterExternalDocumentSigners } from "@/lib/signatures/rma-signature"
import type { DispatchStageRecord } from "@/lib/dispatch/stage-tracker"
import {
  createDocumentSendTimeline,
  markTimelineFailed,
  markTimelineRunning,
  markTimelineSuccess,
  mergeServerDispatchStages,
} from "@/lib/dispatch/client-timeline"

export function SendDocumentPage() {
  const { slug: currentSlug, agencyId, activeWorkspace } = useRequireWorkspace()
  const user = useAuthStore((s) => s.user)
  const steps = ["Type", "Upload", "Signers", "Email", "Review", "Send"]
  const [currentStep, setCurrentStep] = React.useState(0)
  const [agreementType, setAgreementType] = React.useState<"custom" | null>("custom")
  const [lastSaved, setLastSaved] = React.useState("Just now")
  const [saving, setSaving] = React.useState(false)

  const { addDocument } = useDocuments()
  
  // Step 1: Upload state
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; size: string; type: string; pages: number, file?: File } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0]
      setUploadedFile({
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + " MB",
        type: f.name.endsWith('.pdf') ? 'PDF' : 'DOC',
        pages: 1,
        file: f
      })
    }
  }

  // Step 2: Signers state
  interface SignerItem {
    id: string
    name: string
    email: string
    role: string
    order: number
  }
  const [signersList, setSignersList] = React.useState<SignerItem[]>([
    { id: "S-1", name: "", email: "", role: "Client", order: 1 },
  ])

  // Step 3: Email state
  const defaultEmailTemplates = [
    { id: "t1", name: "Standard Visa Intake Signature Request", subject: "Action Required: Digital Signature needed for Australian Visa File", message: "Please review and digitally sign the attached evidentiary document for your Australian visa application. This document must be executed in compliance with OMARA practice requirements. Click the review link below to get started." },
    { id: "t2", name: "Follow-up Evidentiary Declaration Request", subject: "Follow-up: Complete Stat Dec for Subclass 820 Sponsor Details", message: "Following our initial matter interview, we have drafted the necessary sponsor particulars checklist. Please check, digitally countersign the declarations, and verify secure local locks." },
    { id: "t3", name: "Urgent Appeals Representation Mandate", subject: "URGENT: Review AAT Appeals Representation Contract", message: "We have finalized your AAT Review Application particulars. Please execute this retainer agreement immediately so we may log the appeals registry before the statutory deadline." },
  ]
  const [emailSubject, setEmailSubject] = React.useState(defaultEmailTemplates[0].subject)
  const [emailMessage, setEmailMessage] = React.useState(defaultEmailTemplates[0].message)
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("t1")
  const [ccMe, setCcMe] = React.useState(true)
  const [autoRemind7Days, setAutoRemind7Days] = React.useState(true)
  const [emailOnComplete, setEmailOnComplete] = React.useState(true)
  const [filePreviewUrl, setFilePreviewUrl] = React.useState<string | null>(null)
  const [attestationPreviewUrl, setAttestationPreviewUrl] = React.useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [draftRestored, setDraftRestored] = React.useState(false)

  // Step 5: Send state
  const [dispatchStages, setDispatchStages] = React.useState<DispatchStageRecord[]>([])
  const [dispatchBusy, setDispatchBusy] = React.useState(false)
  const [sendSuccess, setSendSuccess] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [supportRef, setSupportRef] = React.useState<string | null>(null)
  const [confirmedSignwellId, setConfirmedSignwellId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/documents/wizard-draft")
        if (!res.ok || cancelled) return
        const { draft } = await res.json()
        if (!draft?.draft_data || cancelled) return
        const d = draft.draft_data as Record<string, unknown>
        const hasFileMeta =
          d.uploadedFileMeta &&
          typeof d.uploadedFileMeta === "object" &&
          !!(d.uploadedFileMeta as { name?: string }).name
        let restoredStep = typeof d.currentStep === "number" ? d.currentStep : 0
        // Never restore to Send (5) — old drafts showed a fake "uploading" spinner with no dispatch running
        if (restoredStep >= 5) restoredStep = hasFileMeta ? 4 : 0
        else if (restoredStep > 4) restoredStep = 4
        setCurrentStep(restoredStep)
        setSendSuccess(false)
        setHasError(false)
        setDispatchBusy(false)
        setDispatchStages([])
        setSupportRef(null)
        setConfirmedSignwellId(null)
        if (Array.isArray(d.signersList)) setSignersList(d.signersList as SignerItem[])
        if (typeof d.emailSubject === "string") setEmailSubject(d.emailSubject)
        if (typeof d.emailMessage === "string") setEmailMessage(d.emailMessage)
        if (typeof d.ccMe === "boolean") setCcMe(d.ccMe)
        if (typeof d.autoRemind7Days === "boolean") setAutoRemind7Days(d.autoRemind7Days)
        if (typeof d.emailOnComplete === "boolean") setEmailOnComplete(d.emailOnComplete)
        if (d.uploadedFileMeta && typeof d.uploadedFileMeta === "object") {
          const meta = d.uploadedFileMeta as { name: string; size: string; type: string; pages: number }
          setUploadedFile({ ...meta, file: undefined })
        }
        setDraftRestored(true)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (!uploadedFile?.file) {
      setFilePreviewUrl(null)
      return
    }
    if (uploadedFile.type !== "PDF") {
      setFilePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(uploadedFile.file)
    setFilePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadedFile?.file, uploadedFile?.name])

  React.useEffect(() => {
    setSaving(true)
    const timer = setTimeout(async () => {
      try {
        const stepToPersist = currentStep >= 5 ? 4 : currentStep
        await fetch("/api/documents/wizard-draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentStep: stepToPersist,
            draftData: {
              currentStep: stepToPersist,
              signersList,
              emailSubject,
              emailMessage,
              ccMe,
              autoRemind7Days,
              emailOnComplete,
              uploadedFileMeta: uploadedFile
                ? {
                    name: uploadedFile.name,
                    size: uploadedFile.size,
                    type: uploadedFile.type,
                    pages: uploadedFile.pages,
                  }
                : null,
            },
          }),
        })
      } catch {
        /* ignore */
      }
      setSaving(false)
      const now = new Date()
      setLastSaved(`Saved at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`)
    }, 800)
    return () => clearTimeout(timer)
  }, [uploadedFile, signersList, emailSubject, emailMessage, ccMe, autoRemind7Days, emailOnComplete, currentStep])

  React.useEffect(() => {
    if (currentStep !== 4 || !agencyId) return
    let cancelled = false
    setPreviewLoading(true)
    ;(async () => {
      try {
        const res = await fetch("/api/documents/send-document-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agencyId: agencyId || activeWorkspace?.id,
            documentName: uploadedFile?.name || "Document",
          }),
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.previewUrl) {
          setAttestationPreviewUrl(data.previewUrl)
        }
      } catch {
        if (!cancelled) setAttestationPreviewUrl(null)
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentStep, agencyId, activeWorkspace?.id, uploadedFile?.name])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const t = defaultEmailTemplates.find(x => x.id === templateId)
    if (t) {
      setEmailSubject(t.subject)
      setEmailMessage(t.message)
    }
  }

  const addSigner = () => {
    const nextOrder = signersList.length + 1
    const newSigner: SignerItem = {
      id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      email: "",
      role: "Sponsor (Signer)",
      order: nextOrder,
    }
    setSignersList([...signersList, newSigner])
  }

  const removeSigner = (id: string) => {
    if (signersList.length <= 1) return
    const filtered = signersList.filter(s => s.id !== id)
    // Recalculate orders
    const updated = filtered.map((s, idx) => ({ ...s, order: idx + 1 }))
    setSignersList(updated)
  }

  const handleSignerChange = (id: string, field: keyof SignerItem, value: string | number) => {
    const updated = signersList.map((s) => {
      if (s.id === id) {
        return { ...s, [field]: value }
      }
      return s
    })
    setSignersList(updated)
  }

  const clearWizardDraft = async () => {
    try {
      await fetch("/api/documents/wizard-draft", { method: "DELETE" })
    } catch {
      /* ignore */
    }
  }

  const startOver = () => {
    setCurrentStep(0)
    setUploadedFile(null)
    setSignersList([{ id: "S-1", name: "", email: "", role: "Client", order: 1 }])
    setSendSuccess(false)
    setHasError(false)
    setDispatchBusy(false)
    setDispatchStages([])
    setDraftRestored(false)
    void clearWizardDraft()
  }

  const goToStep = (index: number) => {
    if (dispatchBusy) return
    if (index > currentStep) return
    if (index === 5) return
    setCurrentStep(index)
    setHasError(false)
  }

  const triggerDispatch = async () => {
    if (!uploadedFile?.file) {
      notifyError("File required", "Upload a PDF on the Upload step before sending.")
      setCurrentStep(1)
      return
    }
    const invalidSigner = signersList.some((s) => !s.name?.trim() || !s.email?.trim())
    if (invalidSigner) {
      notifyError("Signers required", "Complete signer name and email before sending.")
      setCurrentStep(2)
      return
    }
    setCurrentStep(5)
    setDispatchBusy(true)
    setSendSuccess(false)
    setHasError(false)
    setErrorMessage(null)
    setSupportRef(null)
    setConfirmedSignwellId(null)
    let stages = createDocumentSendTimeline()
    setDispatchStages(stages)

    try {
      if (!uploadedFile?.file) throw new Error("No file uploaded")
      const supabase = createClient()
      const resolvedAgencyId = await getRealAgencyId(
        supabase,
        agencyId || activeWorkspace?.id || "",
      )
      if (!resolvedAgencyId) throw new Error("No active workspace")

      stages = markTimelineRunning(stages, "upload")
      setDispatchStages(stages)
      const document = await addDocument({ file: uploadedFile.file })
      if (!document) throw new Error("Document upload returned empty result")
      stages = markTimelineSuccess(stages, "upload")
      setDispatchStages(stages)

      const senderEmail = (user?.email || "").trim().toLowerCase()
      const externalSigners = filterExternalDocumentSigners(signersList, senderEmail)
      if (externalSigners.length === 0) {
        throw new Error(
          "Add at least one external signer. Your agent signature is applied automatically — remove yourself from the signer list.",
        )
      }

      stages = markTimelineRunning(stages, "pdf")
      setDispatchStages(stages)

      const data = await withGlobalTask(
        "send-document",
        "Sending document for signature",
        async () => {
          const res = await fetch("/api/documents/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              documentId: document.id,
              agencyId: resolvedAgencyId,
              signers: externalSigners,
              pageCount: uploadedFile?.pages || 1,
              emailSubject,
              emailMessage,
              ccMe,
              autoRemind7Days,
              emailOnComplete,
            }),
          })
          const raw = await res.text()
          let json: Record<string, unknown> = {}
          try {
            json = raw ? JSON.parse(raw) : {}
          } catch {
            throw new Error(
              res.ok
                ? "Invalid response from send API"
                : `Send API failed (${res.status}). Restart the dev server if you see HTML errors.`,
            )
          }
          if (!res.ok || !json.success) {
            const err = new Error(json.error || "Failed to dispatch signature request") as Error & {
              stages?: DispatchStageRecord[]
              supportRef?: string
            }
            err.stages = json.stages
            err.supportRef = json.supportRef
            throw err
          }
          if (!json.signwellDocumentId) {
            throw new Error(
              "Dispatch did not return a SignWell document id. No signing emails were sent.",
            )
          }
          return json
        },
        { overlay: true },
      )

      if (data.supportRef) setSupportRef(data.supportRef)
      stages = mergeServerDispatchStages(stages, data.stages)

      const verifyRes = await fetch(
        `/api/documents/${document.id}/dispatch-verify?agencyId=${encodeURIComponent(resolvedAgencyId)}`,
      )
      const verify = await verifyRes.json()
      if (!verifyRes.ok || !verify.confirmed || !verify.signwellDocumentId) {
        throw new Error(
          verify.error || "Database did not confirm SignWell dispatch. Success screen blocked.",
        )
      }

      stages = markTimelineSuccess(stages, "completed")
      setDispatchStages(stages)
      setConfirmedSignwellId(verify.signwellDocumentId)
      setSendSuccess(true)
      const testNote = data.signwellTestMode
        ? " SignWell test mode is on — set SIGNWELL_TEST_MODE=false on Vercel for real inbox delivery."
        : ""
      notifySuccess(
        "Document sent",
        `Signature requests dispatched.${testNote}`,
      )
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : "An unexpected error occurred."
      const apiStages = (err as { stages?: DispatchStageRecord[] }).stages
      const apiRef = (err as { supportRef?: string }).supportRef
      if (apiRef) setSupportRef(apiRef)
      let failedStages = stages
      if (apiStages?.length) {
        failedStages = mergeServerDispatchStages(stages, apiStages)
      } else {
        const running = failedStages.find((s) => s.status === "running")
        failedStages = markTimelineFailed(
          failedStages,
          running?.id || "pdf",
          message,
        )
      }
      setDispatchStages(failedStages)
      setHasError(true)
      setErrorMessage(message)
      notifyError("Document dispatch failed", message)
    } finally {
      setDispatchBusy(false)
    }
  }

  if (!currentSlug) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading workspace...
      </div>
    )
  }

  const renderTypeStep = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1">
        <Card
          onClick={() => {
            setAgreementType("custom")
            setCurrentStep(1)
          }}
          className="cursor-pointer border-[#E7E7E7] bg-white transition-all duration-300 hover:border-[#111111]/20 hover:shadow-[0_8px_24px_rgba(17,17,17,0.06)] group"
        >
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] text-[#111111] group-hover:scale-105 transition-transform">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="section-title">Upload custom agreement</p>
              <p className="page-description mx-auto mt-2 max-w-md">
                Upload PDF or DOCX files and route them for secure electronic signature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            setUploadedFile({
              name: f.name,
              size: (f.size / 1024 / 1024).toFixed(2) + " MB",
              type: f.name.endsWith('.pdf') ? 'PDF' : 'DOC',
              pages: 1,
              file: f
            });
          }
        }}
        className={cn(
          "flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center p-8 transition-all duration-300",
          dragging 
            ? "border-[#111111] bg-[#FAFAFA]" 
            : uploadedFile 
              ? "border-[#111111]/60 bg-[#FAFAFA]/10" 
              : "border-slate-200 bg-[#FAFAFA]/40 hover:bg-[#FAFAFA]"
        )}
      >
        {uploadedFile ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7] shadow-sm">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-sans-ui text-base font-semibold text-[#111111]">{uploadedFile.name}</p>
              <p className="font-sans-ui text-xs text-[#5C5C5C] font-medium mt-1.5">{uploadedFile.size} · {uploadedFile.pages} pages · {uploadedFile.type}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUploadedFile(null)} 
                className="h-9 rounded-xl border-slate-200 text-slate-500 font-bold text-xs"
              >
                Change Document
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7] animate-pulse">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <p className="section-title">Drop PDF here</p>
              <p className="page-description mx-auto mt-2 max-w-sm text-xs">
                Drag and drop your legal briefs, personal declaration packets, or visa templates up to 10MB here.
              </p>
            </div>
            <div>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="rounded-xl bg-[#111111] font-bold shadow-md hover:bg-[#222222]"
              >
                Choose File
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(0)}
          className="rounded-xl border-slate-200 bg-white font-bold px-6"
        >
          Back
        </Button>
        <Button
          disabled={!uploadedFile?.file}
          onClick={() => setCurrentStep(2)}
          className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222] disabled:opacity-40 disabled:hover:bg-[#111111]"
        >
          Assign Signers <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const previewSignerEmail =
    process.env.NEXT_PUBLIC_DEMO_SIGNER_EMAIL ||
    (process.env.NODE_ENV !== "production" ? "kartiksingh2829@gmail.com" : "")

  const fillDemoSigner = () => {
    if (!previewSignerEmail) return
    setSignersList([
      {
        id: signersList[0]?.id || "S-1",
        name: "Kartik Singh",
        email: previewSignerEmail,
        role: "Client",
        order: 1,
      },
    ])
  }

  const renderSignersStep = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E7E7E7] bg-[#FAFAFA]/80 p-4 text-xs font-semibold text-[#111111]">
        Your signature ({user?.name || 'sender'}) is applied automatically when you send. Only external recipients below receive SignWell signing requests.
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">External recipients only</div>
          <div className="flex gap-2">
            {previewSignerEmail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoSigner}
                className="h-9 rounded-xl border-slate-200 font-bold text-xs"
              >
                Use verification recipient
              </Button>
            )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={addSigner}
            className="h-9 rounded-xl border-slate-200 text-[#111111] font-bold text-xs hover:bg-[#FAFAFA]"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Recipient Signer
          </Button>
          </div>
        </div>

        <div className="space-y-3">
          {signersList.map((signer, index) => (
            <div 
              key={signer.id}
              className="grid gap-3 bg-white border border-slate-200/50 rounded-xl p-4 md:grid-cols-[40px_1fr_1.2fr_1fr_40px] md:items-center relative"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-black text-xs">
                {index + 1}
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Full Name
                <Input 
                  required
                  value={signer.name}
                  onChange={(e) => handleSignerChange(signer.id, "name", e.target.value)}
                  placeholder="e.g. Gurpreet Singh" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Email Address
                <Input 
                  required
                  type="email"
                  value={signer.email}
                  onChange={(e) => handleSignerChange(signer.id, "email", e.target.value)}
                  placeholder="e.g. signer@email.com" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Role Select
                <select 
                  value={signer.role}
                  onChange={(e) => handleSignerChange(signer.id, "role", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
                >
                  <option value="Primary Client (Signer)">Primary Client (Signer)</option>
                  <option value="Sponsor (Signer)">Sponsor (Signer)</option>
                  <option value="Witness (Declarant)">Witness (Declarant)</option>
                </select>
              </label>

              <div className="flex justify-end pt-5 md:pt-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSigner(signer.id)}
                  disabled={signersList.length <= 1}
                  className="h-8 w-8 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button 
          disabled={signersList.some(s => !s.name || !s.email)}
          onClick={() => setCurrentStep(3)}  
          className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222] disabled:opacity-40"
        >
          Email Customise <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Editor */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Intimation Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            >
              {defaultEmailTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter secure email header..."
              className="h-11 rounded-xl text-xs font-semibold border-slate-200 bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Message Template</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Draft secure instructions..."
              className="flex min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#111111]"
            />
          </div>

          <div className="space-y-3">
            {[
              { key: "ccMe" as const, label: "CC me on all emails", value: ccMe, set: setCcMe },
              { key: "autoRemind7Days" as const, label: "Auto-remind unsigned after 7 days", value: autoRemind7Days, set: setAutoRemind7Days },
              { key: "emailOnComplete" as const, label: "Email me when all signers complete", value: emailOnComplete, set: setEmailOnComplete },
            ].map(({ key, label, value, set }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#111111] focus:ring-[#111111]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Live Inbox Mockup */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Email preview (not the live SignWell link)
          </div>
          <Card className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Window bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-[#111111]" />
              </span>
              <span>secure-mail-viewer</span>
            </div>
            
            <div className="p-5 space-y-4 text-[11px] text-[#111111]">
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <div><span className="text-slate-400 font-bold">From:</span> ImmiMate <strong className="text-slate-700">support@immimate.app</strong></div>
                <div><span className="text-slate-400 font-bold">To:</span> {signersList[0]?.name || "Client"} <strong className="text-slate-700">&lt;{signersList[0]?.email || "client@email.com"}&gt;</strong></div>
                <div><span className="text-slate-400 font-bold">Subject:</span> <strong className="text-slate-700">{emailSubject}</strong></div>
              </div>

              {/* Message body */}
              <div className="space-y-3 leading-relaxed font-semibold text-slate-600">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-black text-[#081b36] tracking-tight">Secure signature request</span>
                </div>

                <p>Dear {signersList[0]?.name || "Client Signatory"},</p>
                
                <p className="whitespace-pre-wrap">{emailMessage}</p>

                <div className="py-2">
                  <div
                    className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-center text-xs font-bold text-slate-500"
                    aria-hidden
                  >
                    Review &amp; Sign — sent by SignWell email after dispatch
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium">
                  Recipients receive a real signing link from SignWell after you send. Signature fields are placed on the last page of your PDF (or use SignWell text tags in the file).
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button onClick={() => setCurrentStep(4)} className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">
          Review Packet <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="font-bold text-sm text-[#081b36]">Document preview</div>
        {!uploadedFile?.file && draftRestored && (
          <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-100 rounded-lg p-3">
            Draft restored — re-upload your file on the Upload step before sending.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Uploaded file</span>
            {filePreviewUrl ? (
              <iframe title="Document preview" src={filePreviewUrl} className="w-full h-[320px] rounded-xl border border-slate-200 bg-slate-50" />
            ) : (
              <div className="h-[120px] rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-semibold">
                {uploadedFile?.type === "PDF" ? "Re-upload PDF to preview" : "Preview available for PDF files"}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Agent certification (pre-signed — not a SignWell signer step)</span>
            {previewLoading ? (
              <div className="h-[320px] rounded-xl border border-slate-200 flex items-center justify-center text-xs text-slate-400">Generating preview…</div>
            ) : attestationPreviewUrl ? (
              <iframe title="Agent attestation preview" src={attestationPreviewUrl} className="w-full h-[320px] rounded-xl border border-slate-200 bg-slate-50" />
            ) : (
              <div className="h-[120px] rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-semibold">
                Configure your signature in RMA Team settings to preview
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Verification Summary */}
        <div className="space-y-5 text-xs text-[#111111]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="font-bold text-sm text-[#081b36]">Intake File Summary</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Document Pack</span>
                <div className="font-bold text-slate-700 truncate">{uploadedFile?.name || "No file selected"}</div>
                <div className="text-xs text-slate-400 font-bold">{uploadedFile?.size || "0 MB"} • {uploadedFile?.type || "Document"}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Upload Details</span>
                <div className="font-bold text-[#111111] truncate">{user?.name || "Current User"}</div>
                <div className="text-xs text-slate-400 font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="font-bold text-sm text-[#081b36]">Recipient Workflow</div>
            <div className="space-y-3">
              {signersList.map((signer, index) => (
                <div key={signer.id} className="flex gap-4 items-center">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-black text-xs">
                      {index + 1}
                    </div>
                    {index < signersList.length - 1 && <div className="h-8 w-px bg-slate-200 my-1" />}
                  </div>
                  <div className={index < signersList.length - 1 ? "pb-3" : ""}>
                    <div className="font-bold text-slate-700">{signer.name}</div>
                    <div className="text-xs text-slate-400 font-bold">{signer.role} • {signer.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-5">
          <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
            <div className="bg-gradient-to-r from-[#FAFAFA] to-white px-5 py-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#111111]" />
                <span className="font-bold text-[#111111]">Ready for Secure Dispatch</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                You are about to issue a legally binding signature request. This action will lock the attached document hashes and dispatch secure OTP links to all listed signers.
              </p>
              
              <div className="rounded-lg bg-[#FAFAFA] border border-[#E7E7E7] p-3 flex gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-[#111111] shrink-0" />
                <div className="text-[11px] text-[#5C5C5C] font-semibold">
                  Reminders will be automatically dispatched every 48 hours until executed.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(3)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button
          disabled={!uploadedFile?.file || dispatchBusy}
          onClick={triggerDispatch}
          className="rounded-xl bg-[#111111] text-white font-bold px-6 shadow-md hover:bg-slate-800 disabled:opacity-50"
        >
          Sign & Dispatch to Recipients <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderSendStep = () => {
    const dispatchIdle = !dispatchBusy && !hasError && !sendSuccess
    if (dispatchIdle) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center space-y-6">
          <p className="text-sm text-slate-600 font-medium max-w-md">
            Dispatch has not started. Go back to review your file and signers, then send from the Review step.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(4)}
              className="rounded-xl border-slate-200 font-bold px-6"
            >
              Back to Review
            </Button>
            <Button
              disabled={!uploadedFile?.file}
              onClick={() => void triggerDispatch()}
              className="rounded-xl bg-[#111111] font-bold px-6"
            >
              Send now
            </Button>
          </div>
        </div>
      )
    }

    return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      {hasError ? (
        <div className="w-full max-w-2xl space-y-6">
          {dispatchStages.length > 0 && (
            <DispatchTimeline
              title="Dispatch failed"
              subtitle="The operation stopped at the step shown below."
              stages={dispatchStages}
              supportRef={supportRef || undefined}
            />
          )}
          <ProfessionalErrorPanel
            kind="signwell_failure"
            detail={errorMessage || undefined}
            supportRef={supportRef || undefined}
            onRetry={() => {
              setHasError(false)
              setCurrentStep(4)
            }}
            backHref={`/workspace/${currentSlug}/documents/send`}
            backLabel="Back to Review"
          />
        </div>
      ) : sendSuccess && confirmedSignwellId ? (
        <div className="w-full max-w-2xl space-y-6">
          {dispatchStages.length > 0 && (
            <DispatchTimeline
              title="Document dispatched securely"
              subtitle="SignWell confirmed and the database was updated."
              stages={dispatchStages}
              supportRef={supportRef || undefined}
            />
          )}
          <div className="text-center space-y-2">
            <p className="text-xs font-mono text-slate-500">SignWell ID: {confirmedSignwellId}</p>
            <p className="text-xs text-[#111111] font-semibold">Database confirmation received.</p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href={`/workspace/${currentSlug}/documents`}>
              <Button variant="outline" className="rounded-xl border-slate-200 font-bold px-6">View Documents</Button>
            </Link>
            <Link href={`/workspace/${currentSlug}/dashboard`}>
              <Button className="rounded-xl bg-[#111111] font-bold px-6 shadow-md hover:bg-[#222222]">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          <DispatchTimeline
            title="Sending document for signature"
            subtitle="Do not close this window until dispatch completes."
            stages={dispatchStages.length ? dispatchStages : createDocumentSendTimeline()}
            supportRef={supportRef || undefined}
          />
        </div>
      )}
    </div>
    )
  }

  return (
    <div className="animate-enter mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Documents"
        title="Send document for signature"
        description="Upload documents, assign recipients, and execute securely from one guided workflow."
        action={
          <div className="flex items-center gap-3 text-xs font-bold text-[#5C5C5C]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={dispatchBusy}
              onClick={startOver}
              className="text-[#5C5C5C] font-bold"
            >
              Start over
            </Button>
            {saving ? (
              <span className="flex items-center text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" /> Saving...
              </span>
            ) : (
              <span>{lastSaved}</span>
            )}
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white shadow-[0_1px_3px_rgba(17,17,17,0.06),0_8px_24px_rgba(17,17,17,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] px-6 py-4 overflow-x-auto immimate-scroll">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const canNavigateBack = isCompleted && !dispatchBusy && index < 5
            return (
              <div key={step} className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled={!canNavigateBack}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "flex items-center gap-3 shrink-0 text-left",
                    canNavigateBack ? "cursor-pointer hover:opacity-80" : "cursor-default",
                  )}
                >
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-colors duration-300",
                  isActive ? "bg-[#111111] text-white shadow-[0_4px_12px_rgba(17,17,17,0.12)]" :
                  isCompleted ? "bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]" :
                  "bg-[#FAFAFA] text-[#5C5C5C] border border-[#E7E7E7]"
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider mr-6",
                  isActive ? "text-[#111111]" : isCompleted ? "text-[#111111]" : "text-[#5C5C5C]"
                )}>
                  {step}
                </span>
                </button>
                {index < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[#E7E7E7] mr-6" />}
              </div>
            )
          })}
        </div>
        
        <div className="p-6 md:p-10">
          {currentStep === 0 && renderTypeStep()}
          {currentStep === 1 && renderUploadStep()}
          {currentStep === 2 && renderSignersStep()}
          {currentStep === 3 && renderEmailStep()}
          {currentStep === 4 && renderReviewStep()}
          {currentStep === 5 && renderSendStep()}
        </div>
      </div>
    </div>
  )
}
