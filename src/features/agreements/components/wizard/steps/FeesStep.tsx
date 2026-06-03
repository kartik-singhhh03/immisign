"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { AgreementWizardFormData } from "../../../types/wizard"
import { WizardNav } from "../WizardNav"

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
  )
}

const selectClass =
  "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"

type Props = {
  form: AgreementWizardFormData
  agencySlug: string
  paymentScheduleOptions: string[]
  onChange: (field: keyof AgreementWizardFormData, value: string) => void
  onBack: () => void
  onContinue: () => void
}

export function FeesStep({ form, agencySlug, paymentScheduleOptions, onChange, onBack, onContinue }: Props) {
  const canContinue = Boolean(form.professionalFee.trim() && parseFloat(form.professionalFee) > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#081B2E]">Fees</h2>
        <p className="text-sm text-slate-500 mt-1">Set professional fees and payment schedule.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel required>Professional Fee (AUD)</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="e.g. 3500"
            value={form.professionalFee}
            onChange={(e) => onChange("professionalFee", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Estimated Disbursements (AUD)</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="e.g. 4640 (VAC)"
            value={form.estimatedDisbursements}
            onChange={(e) => onChange("estimatedDisbursements", e.target.value)}
          />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <FieldLabel>Payment Schedule</FieldLabel>
          <select
            className={selectClass}
            value={form.paymentSchedule}
            onChange={(e) => onChange("paymentSchedule", e.target.value)}
          >
            {paymentScheduleOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#0D9F8C]/20 bg-[#ecfdf5]/50 p-4 text-sm text-slate-600">
        <Zap className="h-5 w-5 shrink-0 text-[#0D9F8C] mt-0.5" />
        <p>
          <span className="font-semibold text-[#081B2E]">Tip:</span> Add or customise payment schedules in{" "}
          <Link href={`/workspace/${agencySlug}/settings?section=PaymentSchedules`} className="font-bold text-[#0D9F8C] hover:underline">
            Settings → Payment Schedules
          </Link>
          .
        </p>
      </div>

      <WizardNav
        showBack
        continueDisabled={!canContinue}
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  )
}
