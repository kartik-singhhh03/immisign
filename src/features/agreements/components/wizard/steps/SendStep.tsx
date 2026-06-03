"use client"

import Link from "next/link"
import { CheckCircle2, Lock, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from "../../../types/wizard"

type Props = {
  form: AgreementWizardFormData
  agency: AgencyWizardContext
  rmaOptions: RmaOption[]
  agreementRef: string
  saving: boolean
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
  dispatched,
  apiError,
  apiResponse,
  agencySlug,
  onChange,
  onBack,
  onSend,
}: Props) {
  const selectedRma = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault) || rmaOptions[0]

  if (dispatched && apiResponse) {
    const { agreementId, signwellResult } = apiResponse
    return (
      <Card className="rounded-2xl border border-emerald-100 bg-[#f8fffd]/80 p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black text-[#081b36] text-center">Agreement Sent for Signature</h2>
        <p className="mt-3 text-slate-600 text-sm text-center max-w-md mx-auto">
          The agreement has been generated, stored securely, and dispatched via SignWell.
        </p>
        <div className="mt-6 text-xs font-semibold text-slate-600 space-y-2 border-y border-emerald-100 py-4">
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

  if (saving) {
    return (
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-bold text-[#081B2E]">Sending Agreement...</h3>
        <p className="text-sm text-slate-500">Creating record, generating PDF, and dispatching for signature.</p>
        <div className="h-1.5 w-full max-w-md mx-auto bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0D9F8C] animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#081B2E]">Send</h2>
        <p className="text-sm text-slate-500 mt-1">Send secure signing links to all parties.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div><span className="text-slate-400 text-xs font-bold uppercase">Client</span><p className="font-semibold text-[#081B2E]">{form.clientName}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Email</span><p className="font-semibold text-[#081B2E]">{form.clientEmail}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Matter</span><p className="font-semibold text-[#081B2E]">{form.matterType}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Subclass</span><p className="font-semibold text-[#081B2E]">{form.visaSubclass || "—"}</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Fee</span><p className="font-semibold text-[#081B2E]">${parseFloat(form.professionalFee || "0").toLocaleString("en-AU")} AUD</p></div>
          <div><span className="text-slate-400 text-xs font-bold uppercase">Agent</span><p className="font-semibold text-[#081B2E]">{selectedRma?.name || "—"}</p></div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#0D9F8C]/20 bg-[#ecfdf5]/50 p-4 text-sm text-slate-700">
        <Lock className="h-5 w-5 shrink-0 text-[#0D9F8C] mt-0.5" />
        <p>Secure signing links will be sent to <strong>1 signer</strong>.</p>
      </div>

      <label className="grid gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email Message</span>
        <textarea
          className="flex min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0D9F8C] resize-y"
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
              className="h-4 w-4 rounded border-slate-300 text-[#0D9F8C] focus:ring-[#0D9F8C]"
            />
            {label}
          </label>
        ))}
      </div>

      {apiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
          {apiError}
        </div>
      )}

      <Button
        type="button"
        disabled={saving}
        onClick={onSend}
        className="w-full h-14 rounded-xl bg-[#0D9F8C] font-black text-white hover:bg-[#0A5B52] shadow-md text-base"
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
