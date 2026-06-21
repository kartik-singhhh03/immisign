"use client"

import Link from "next/link"
import { CheckCircle2, FileText, Lock, PenLine } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DispatchTimeline } from "@/components/ui/standards"
import type { DispatchStageRecord } from "@/lib/dispatch/stage-tracker"
import { ProfessionalErrorPanel } from "@/components/errors/professional-error"
import { PhoneInput } from "@/components/ui/phone-input"
import { ImmiMateInput } from "@/components/ui/immimate-form"
import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from "../../../types/wizard"
import { composeClientFullName } from "../../../types/wizard"
import { calculateFeeTotals, formatCurrencyAud, formatMatterDisplayLine } from "../../../lib/fee-items"
import { AgreementLifecycleTimeline } from "../../AgreementLifecycleTimeline"
import React from "react"
import { isAgreementDispatchSuccess } from "@/lib/signing/dispatch-result"
import { isNativeSigningClient } from "@/lib/signing/client-config"
import { APP_NAME } from "@/lib/brand"

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
  )
}

type Props = {
  form: AgreementWizardFormData
  agency: AgencyWizardContext
  rmaOptions: RmaOption[]
  agreementRef: string
  saving: boolean
  dispatchStages: DispatchStageRecord[]
  dispatchSupportRef?: string | null
  dispatched: boolean
  dispatchPartialSuccess?: boolean
  apiError: string | null
  apiResponse: any
  agencySlug: string
  onChange: (field: keyof AgreementWizardFormData, value: string | boolean) => void
  onBack: () => void
  onSend: () => void
}

export function SendStep({
  form,
  agency,
  rmaOptions,
  agreementRef,
  saving,
  dispatchStages,
  dispatchSupportRef,
  dispatched,
  dispatchPartialSuccess,
  apiError,
  apiResponse,
  agencySlug,
  onChange,
  onBack,
  onSend,
}: Props) {
  const selectedRma = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault) || rmaOptions[0]
  const feeTotals = calculateFeeTotals(form)
  const clientFullName = composeClientFullName(form)
  const matterLine = formatMatterDisplayLine(form)

  const executionValid =
    Boolean(form.clientFirstName.trim()) &&
    Boolean(form.clientLastName.trim()) &&
    Boolean(form.clientEmail.trim()) &&
    Boolean(form.clientDob.trim())

  const dispatchSucceeded = dispatched && isAgreementDispatchSuccess(apiResponse || {})
  const nativeSigning = isNativeSigningClient() || apiResponse?.signingProvider === "native"

  return (
    <AnimatePresence mode="wait">
      {dispatchSucceeded ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Card className="rounded-2xl border border-[#E7E7E7] bg-[#f8fffd]/80 p-8 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7] mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="section-title text-2xl text-center">Agreement sent for signature</h2>
            <p className="mt-3 text-slate-600 text-sm text-center max-w-md mx-auto">
              The agreement has been generated with the responsible agent details applied automatically.
              {nativeSigning
                ? ` The client will receive an ${APP_NAME} signing link by email.`
                : " Only client signers were sent the external signing request."}
            </p>
            <div className="mt-6 text-xs font-semibold text-slate-600 space-y-2 border-y border-[#E7E7E7] py-4">
              <div className="flex justify-between"><span className="text-slate-400">Agreement Ref</span><span className="font-mono">{agreementRef}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Agreement ID</span><span className="font-mono">{apiResponse.agreementId}</span></div>
              {apiResponse.signingUrl && (
                <div className="flex justify-between gap-4"><span className="text-slate-400 shrink-0">Signing Link</span><span className="font-mono text-right break-all">{apiResponse.signingUrl}</span></div>
              )}
              {apiResponse.signwellResult?.id && (
                <div className="flex justify-between"><span className="text-slate-400">External Doc ID</span><span className="font-mono">{apiResponse.signwellResult.id}</span></div>
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="outline" className="rounded-xl font-bold">
                <Link href={`/workspace/${agencySlug}/agreements`}>View Agreements</Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : dispatchPartialSuccess && apiResponse?.agreementId ? (
        <motion.div
          key="partial"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-700 border border-amber-200 mb-6">
              <FileText className="h-10 w-10" />
            </div>
            <h2 className="section-title text-2xl text-center">Agreement saved — signing dispatch failed</h2>
            <p className="mt-3 text-slate-700 text-sm text-center max-w-lg mx-auto">
              Your agreement PDF was generated and saved. No data was lost. The signing request could not be sent
              {apiError ? `: ${apiError}` : '.'}
            </p>
            <div className="mt-6 text-xs font-semibold text-slate-600 space-y-2 border-y border-amber-200/60 py-4">
              <div className="flex justify-between"><span className="text-slate-400">Agreement Ref</span><span className="font-mono">{agreementRef}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Agreement ID</span><span className="font-mono">{apiResponse.agreementId}</span></div>
              {dispatchSupportRef && (
                <div className="flex justify-between"><span className="text-slate-400">Support Ref</span><span className="font-mono">{dispatchSupportRef}</span></div>
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={onSend} className="rounded-xl font-bold bg-[#111111] hover:bg-[#222222]">
                Retry Signing Dispatch
              </Button>
              <Button asChild variant="outline" className="rounded-xl font-bold">
                <Link href={`/workspace/${agencySlug}/agreements/${apiResponse.agreementId}`}>Open Agreement</Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : saving || apiError ? (
        <motion.div
          key="dispatching"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {dispatchStages.length > 0 && (
            <DispatchTimeline
              title={apiError ? "Agreement dispatch failed" : "Generating and sending agreement"}
              subtitle="Real backend progress only — please keep this tab open."
              stages={dispatchStages}
              supportRef={dispatchSupportRef || undefined}
            />
          )}
          {apiError && !dispatchPartialSuccess && (
            <ProfessionalErrorPanel
              kind="signing_dispatch_failure"
              detail={apiError}
              supportRef={dispatchSupportRef || undefined}
              onRetry={onSend}
              backHref={`/workspace/${agencySlug}/agreements`}
              backLabel="View agreements"
            />
          )}
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-[#111111]">Execution &amp; Send</h2>
            <p className="text-sm text-slate-500 mt-1">Confirm client identity, then generate the PDF and send for signature.</p>
          </div>

          <AgreementLifecycleTimeline status="pending" hasPdf className="py-1" />

          <div className="rounded-2xl border border-slate-200 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Client Identity (for execution)</h3>
              <p className="text-xs text-slate-500 mt-0.5">These details appear on the agreement and signature block.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <FieldLabel required>First Name</FieldLabel>
                <ImmiMateInput
                  value={form.clientFirstName}
                  onChange={(e) => onChange("clientFirstName", e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel>Middle Name</FieldLabel>
                <ImmiMateInput
                  value={form.clientMiddleName}
                  onChange={(e) => onChange("clientMiddleName", e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Last Name</FieldLabel>
                <ImmiMateInput
                  value={form.clientLastName}
                  onChange={(e) => onChange("clientLastName", e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Date of Birth</FieldLabel>
                <ImmiMateInput
                  type="date"
                  value={form.clientDob}
                  onChange={(e) => onChange("clientDob", e.target.value)}
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <FieldLabel required>Email</FieldLabel>
                <ImmiMateInput
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => onChange("clientEmail", e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel>Mobile</FieldLabel>
                <PhoneInput
                  value={form.clientPhone}
                  onChange={(v) => onChange("clientPhone", v)}
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <FieldLabel>Address</FieldLabel>
                <ImmiMateInput
                  placeholder="Street, Suburb, State, Postcode"
                  value={form.clientAddress}
                  onChange={(e) => onChange("clientAddress", e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><span className="text-slate-400 text-xs font-bold uppercase">Client</span><p className="font-semibold text-[#111111]">{clientFullName || form.clientName}</p></div>
              <div><span className="text-slate-400 text-xs font-bold uppercase">Matter</span><p className="font-semibold text-[#111111]">{matterLine}</p></div>
              <div><span className="text-slate-400 text-xs font-bold uppercase">Grand Total</span><p className="font-semibold text-[#111111]">{formatCurrencyAud(feeTotals.grandTotal)}</p></div>
              <div><span className="text-slate-400 text-xs font-bold uppercase">Agent</span><p className="font-semibold text-[#111111]">{selectedRma?.name || "—"}</p></div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[#111111]/20 bg-[#FAFAFA]/50 p-4 text-sm text-slate-700">
            <Lock className="h-5 w-5 shrink-0 text-[#111111] mt-0.5" />
            <p>
              <strong>{selectedRma?.name || "The responsible agent"}</strong> — name, MARN and agency are applied automatically on the PDF.
              {nativeSigning
                ? `Only the client signs electronically via the ${APP_NAME} signing portal.`
                : "Only the client signs electronically via the external signing provider."}
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email Message</span>
            <p className="text-xs text-slate-500 -mt-1">
              Your personal note appears in the email. A secure signing button and link are added automatically.
            </p>
            <textarea
              className="flex min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#111111] resize-y"
              value={form.emailMessage}
              onChange={(e) => onChange("emailMessage", e.target.value)}
            />
          </label>

          <div className="space-y-3">
            {[
              { key: "ccMe" as const, label: "CC me on all emails" },
              { key: "autoRemind7Days" as const, label: "Auto-remind unsigned after 7 days" },
              { key: "emailOnComplete" as const, label: "Email me when all signers complete" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => onChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#111111] focus:ring-[#111111]"
                />
                {label}
              </label>
            ))}
          </div>

          <Button
            type="button"
            disabled={saving || !executionValid}
            onClick={onSend}
            className="w-full h-14 rounded-xl bg-[#111111] font-black text-white hover:bg-[#222222] shadow-md text-base"
          >
            <PenLine className="h-5 w-5 mr-2" />
            Send Agreement for Signature
          </Button>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="rounded-xl border-slate-200 bg-white font-bold px-6 h-11"
            >
              Back
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
