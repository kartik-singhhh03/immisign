"use client"

import { PhoneInput } from "@/components/ui/phone-input"
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
  const canContinue = Boolean(form.clientName.trim() && form.clientEmail.trim())
  const fromLibrary = Boolean(form.clientId)

  const handleSelectClient = (clientId: string) => {
    if (clientId === "__new__") {
      onChange("clientId", "")
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
        <h2 className="text-xl font-bold text-[#111111]">Client Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select an existing client from your library or enter details for a new client.
        </p>
      </div>

      {clients.length > 0 && (
        <label className="grid gap-2">
          <FieldLabel>Client from library</FieldLabel>
          <ImmiMateSelect value={form.clientId || "__new__"} onValueChange={handleSelectClient}>
            <ImmiMateSelectTrigger>
              <ImmiMateSelectValue placeholder="Select client" />
            </ImmiMateSelectTrigger>
            <ImmiMateSelectContent>
              <ImmiMateSelectItem value="__new__">Enter new client manually</ImmiMateSelectItem>
              {clients.map((c) => (
                <ImmiMateSelectItem key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </ImmiMateSelectItem>
              ))}
            </ImmiMateSelectContent>
          </ImmiMateSelect>
        </label>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel required>Client Full Name</FieldLabel>
          <ImmiMateInput
            placeholder="e.g. Jane Smith"
            value={form.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
            readOnly={fromLibrary}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel required>Client Email</FieldLabel>
          <ImmiMateInput
            type="email"
            placeholder="client@email.com"
            value={form.clientEmail}
            onChange={(e) => onChange("clientEmail", e.target.value)}
            readOnly={fromLibrary}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Phone</FieldLabel>
          <PhoneInput
            placeholder="+61 4xx xxx xxx"
            value={form.clientPhone}
            onChange={(v) => onChange("clientPhone", v)}
            readOnly={fromLibrary}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Address</FieldLabel>
          <ImmiMateInput
            placeholder="Street, Suburb, State"
            value={form.clientAddress}
            onChange={(e) => onChange("clientAddress", e.target.value)}
          />
        </label>
      </div>

      {fromLibrary && (
        <p className="text-xs font-semibold text-[#111111]">
          Contact details loaded from client record. Address can still be added for this agreement.
        </p>
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
