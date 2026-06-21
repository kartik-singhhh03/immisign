"use client"

import {
  ImmiMateInput,
  ImmiMateSelect,
  ImmiMateSelectContent,
  ImmiMateSelectItem,
  ImmiMateSelectTrigger,
  ImmiMateSelectValue,
} from "@/components/ui/immimate-form"
import type { AgreementWizardFormData, ClientPickerOption } from "../../../types/wizard"
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
  clients: ClientPickerOption[]
  onChange: (field: keyof AgreementWizardFormData, value: string) => void
  onContinue: () => void
}

export function ClientStep({ form, clients, onChange, onContinue }: Props) {
  const canContinue = Boolean(form.clientId || form.clientName.trim())

  const handleSelectClient = (clientId: string) => {
    if (clientId === "__new__") {
      onChange("clientId", "")
      onChange("clientName", "")
      onChange("clientEmail", "")
      return
    }
    const client = clients.find((c) => c.id === clientId)
    if (!client) return
    onChange("clientId", client.id)
    onChange("clientName", client.name)
    onChange("clientEmail", client.email)
    if (client.phone) onChange("clientPhone", client.phone)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Client</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select the client for this agreement. Full identity details are captured at the execution step before signing.
        </p>
      </div>

      {clients.length > 0 && (
        <label className="grid gap-2">
          <FieldLabel required>Client from library</FieldLabel>
          <ImmiMateSelect value={form.clientId || "__new__"} onValueChange={handleSelectClient}>
            <ImmiMateSelectTrigger>
              <ImmiMateSelectValue placeholder="Select client" />
            </ImmiMateSelectTrigger>
            <ImmiMateSelectContent>
              <ImmiMateSelectItem value="__new__">Enter client name manually</ImmiMateSelectItem>
              {clients.map((c) => (
                <ImmiMateSelectItem key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </ImmiMateSelectItem>
              ))}
            </ImmiMateSelectContent>
          </ImmiMateSelect>
        </label>
      )}

      {!form.clientId && (
        <label className="grid gap-2 max-w-md">
          <FieldLabel required>Client Name (reference)</FieldLabel>
          <ImmiMateInput
            placeholder="e.g. Jane Smith"
            value={form.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
          />
          <p className="text-[11px] text-slate-400 font-medium">
            First name, last name, DOB and contact details are entered on the final execution step.
          </p>
        </label>
      )}

      {form.clientId && form.clientName && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
          <p className="font-semibold text-[#111111]">{form.clientName}</p>
          {form.clientEmail && <p className="text-slate-500 text-xs mt-0.5">{form.clientEmail}</p>}
        </div>
      )}

      <WizardNav
        showBack={false}
        continueDisabled={!canContinue}
        onBack={() => {}}
        onContinue={onContinue}
      />
    </div>
  )
}
