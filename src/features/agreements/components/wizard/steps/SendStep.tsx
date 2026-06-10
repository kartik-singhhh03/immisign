"use client"

import Link from "next/link"
import { CheckCircle2, Lock, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DispatchTimeline } from "@/components/ui/standards"
import type { DispatchStageRecord } from "@/lib/dispatch/stage-tracker"
import { ProfessionalErrorPanel } from "@/components/errors/professional-error"
import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from "../../../types/wizard"
import { calculateFeeTotals, formatCurrencyAud } from "../../../lib/fee-items"
import { AgreementLifecycleTimeline } from "../../AgreementLifecycleTimeline"

type Props = {
  form: AgreementWizardFormData
  agency: AgencyWizardContext
  rmaOptions: RmaOption[]
  agreementRef: string
  saving: boolean
  dispatchStages: DispatchStageRecord[]
  dispatchSupportRef?: string | null
  dispatched: boolean
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
  apiError,
  apiResponse,
  agencySlug,
  onChange,
  onBack,
  onSend,
}: Props) {
  const selectedRma = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault) || rmaOptions[0]
  const feeTotals = calculateFeeTotals(form.feeItems || [])

  if (dispatched && apiResponse?.signwellResult?.id) {
    const { agreementId, signwellResult } = apiResponse
    return (
      <Card className="rounded-2xl border border-[#E7E7E7] bg-[#f8fffd]/80 p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7] mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="section-title text-2xl text-center">Agreement sent for signature</h2>
        <p className="mt-3 text-slate-600 text-sm text-center max-w-md mx-auto">
          The agreement has been generated with the responsible agent signature applied automatically. Only client signers were sent via SignWell.
        </p>
        <div className="mt-6 text-xs font-semibold text-slate-600 space-y-2 border-y border-[#E7E7E7] py-4">
          <div className="flex justify-between"><span className="text-slate-400">Agreement Ref</span><span className="font-mono">{agreementRef}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Agreement ID</span><span className="font-mono">{agreementId}</span></div>
          {signwellResult?.id && (
            <div className="flex justify-between"><span className="text-slate-400">SignWell ID</span><span className="font-mono">{signwellResult.id}</span></div>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href={`/workspace/${agencySlug}/agreements`}>View Agreements</Link>
          </Button>
        </div>
      </Card>
    )
  }

  if (saving || apiError) {
    return (
      <div className="space-y-6">
        {dispatchStages.length > 0 && (
          <DispatchTimeline
            title={apiError ? "Agreement dispatch failed" : "Generating and sending agreement"}
            subtitle="Real backend progress only — please keep this tab open."
            stages={dispatchStages}
            supportRef={dispatchSupportRef || undefined}
          />
        )}
        {apiError && (
          <ProfessionalErrorPanel
            kind="signwell_failure"
            detail={apiError}
            supportRef={dispatchSupportRef || undefined}
            onRetry={onSend}
            backHref={`/workspace/${agencySlug}/agreements`}
            backLabel="View agreements"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Send</h2>
        <p className="text-sm text-slate-500 mt-1">PDF is generated first, then sent via SignWell.</p>
      </div>

      <AgreementLifecycleTimeline status="pending" hasPdf className="py-1" />

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div><span className="text-slate-400 text-xs font-bold uppercase">Client</span><p className="font-semibold text-[#111111]">{form.clientName}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Email</span><p className="font-semibold text-[#111111]">{form.clientEmail}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Matter</span><p className="font-semibold text-[#111111]">{form.matterType}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Subclass</span><p className="font-semibold text-[#111111]">{form.visaSubclass || "—"}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Grand Total</span><p className="font-semibold text-[#111111]">{formatCurrencyAud(feeTotals.grandTotal)}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Agent</span><p className="font-semibold text-[#111111]">{selectedRma?.name || "—"}</p></div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#111111]/20 bg-[#FAFAFA]/50 p-4 text-sm text-slate-700">
        <Lock className="h-5 w-5 shrink-0 text-[#111111] mt-0.5" />
        <p>
          <strong>{selectedRma?.name || "The responsible agent"}</strong> signature is applied automatically on the PDF.
          SignWell signing links go to <strong>external client signers only</strong> (not the agent).
        </p>
      </div>

      <label className="grid gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email Message</span>
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

      {apiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold" role="alert">
          {apiError}
        </div>
      )}

      <Button
        type="button"
        disabled={saving}
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
    </div>
  )
}
