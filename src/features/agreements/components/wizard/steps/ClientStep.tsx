"use client"

import { Input } from "@/components/ui/input"
import type { AgreementWizardFormData } from "../../types/wizard"
import { WizardNav } from "../WizardNav"

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
  onChange: (field: keyof AgreementWizardFormData, value: string) => void
  onContinue: () => void
}

export function ClientStep({ form, onChange, onContinue }: Props) {
  const canContinue = Boolean(form.clientName.trim() && form.clientEmail.trim())

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#081B2E]">Client Details</h2>
        <p className="text-sm text-slate-500 mt-1">Enter the client&apos;s contact information.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel required>Client Full Name</FieldLabel>
          <Input
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="e.g. Jane Smith"
            value={form.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel required>Client Email</FieldLabel>
          <Input
            type="email"
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="client@email.com"
            value={form.clientEmail}
            onChange={(e) => onChange("clientEmail", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Phone</FieldLabel>
          <Input
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="+61 4xx xxx xxx"
            value={form.clientPhone}
            onChange={(e) => onChange("clientPhone", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Address</FieldLabel>
          <Input
            className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
            placeholder="Street, Suburb, State"
            value={form.clientAddress}
            onChange={(e) => onChange("clientAddress", e.target.value)}
          />
        </label>
      </div>

      <WizardNav
        showBack={false}
        continueDisabled={!canContinue}
        onBack={() => {}}
        onContinue={onContinue}
      />
    </div>
  )
}
