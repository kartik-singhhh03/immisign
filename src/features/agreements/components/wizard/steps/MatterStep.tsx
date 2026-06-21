"use client"

import React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ImmiMateFieldSelect,
  ImmiMateInput,
  ImmiMateTextarea,
} from "@/components/ui/immimate-form"
import { MatterTypesWorkflowModal } from "@/features/settings/components/MatterTypesWorkflowModal"
import type { MatterTypeConfig } from "@/lib/settings/types"
import type { AgreementWizardFormData, RmaOption } from "../../../types/wizard"
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
  rmaOptions: RmaOption[]
  matterTypes: MatterTypeConfig[]
  onChange: (field: keyof AgreementWizardFormData, value: string | boolean | Record<string, string>) => void
  onMatterTypesUpdated: (matterTypes: MatterTypeConfig[], selectedId?: string) => void
  onBlurSave?: () => void
  onBack: () => void
  onContinue: () => void
}

function resolveMatterType(matterTypes: MatterTypeConfig[], form: AgreementWizardFormData): MatterTypeConfig | undefined {
  if (form.matterTypeId) {
    return matterTypes.find((m) => m.id === form.matterTypeId)
  }
  return matterTypes.find((m) => m.name === form.matterType)
}

function MatterField({
  def,
  value,
  onChange,
}: {
  def: MatterTypeConfig['fields'][0]
  value: string
  onChange: (v: string) => void
}) {
  const colSpan = def.colSpan === 2 ? "md:col-span-2" : ""

  if (def.fieldType === "textarea") {
    return (
      <label className={`grid gap-2 ${colSpan}`}>
        <FieldLabel required={def.required}>{def.label}</FieldLabel>
        <ImmiMateTextarea
          className="min-h-[88px]"
          placeholder={def.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  return (
    <label className={`grid gap-2 ${colSpan}`}>
      <FieldLabel required={def.required}>{def.label}</FieldLabel>
      <ImmiMateInput
        type={def.fieldType === "date" ? "date" : def.fieldType === "email" ? "email" : "text"}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function MatterStep({ form, rmaOptions, matterTypes, onChange, onMatterTypesUpdated, onBlurSave, onBack, onContinue }: Props) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const matterConfig = resolveMatterType(matterTypes, form)
  const canContinue = Boolean(form.matterTypeId || form.matterType.trim())

  const handleMatterTypeChange = (value: string) => {
    const selected = matterTypes.find((m) => m.id === value || m.name === value)
    onChange("matterTypeId", selected?.id || "")
    onChange("matterType", selected?.name || value)
    onChange("matterFieldValues", {})
  }

  const handleFieldValueChange = (key: string, value: string) => {
    onChange("matterFieldValues", { ...form.matterFieldValues, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Matter Details</h2>
        <p className="text-sm text-slate-500 mt-1">Configure the visa matter type and subclass.</p>
      </div>

      <label className="grid gap-2">
        <FieldLabel>Responsible Agent for this matter</FieldLabel>
        <ImmiMateFieldSelect
          value={form.responsibleRma}
          onValueChange={(v) => onChange("responsibleRma", v)}
          placeholder="Select responsible agent..."
          options={rmaOptions.map((rma) => ({
            value: rma.id,
            label: `${rma.name}${rma.isDefault ? " (Default)" : ""}`,
          }))}
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel required>Matter Type</FieldLabel>
          <ImmiMateFieldSelect
            value={form.matterTypeId || form.matterType}
            onValueChange={handleMatterTypeChange}
            placeholder="Select matter type..."
            options={matterTypes.map((opt) => ({ value: opt.id, label: opt.name }))}
          />
          {matterTypes.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-amber-900 font-medium">No matter types configured</p>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl bg-[#111111] hover:bg-[#222222] shrink-0"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Matter Type
              </Button>
            </div>
          )}
          {matterTypes.length > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-bold text-[#111111] hover:underline text-left"
            >
              Manage matter types
            </button>
          )}
        </label>
        <label className="grid gap-2">
          <FieldLabel>Visa Subclass</FieldLabel>
          <ImmiMateInput
            placeholder={matterConfig?.subclassPlaceholder || "e.g. 820, 804, 482"}
            value={form.visaSubclass}
            onChange={(e) => onChange("visaSubclass", e.target.value)}
            onBlur={onBlurSave}
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <FieldLabel>Visa Stream / Description</FieldLabel>
          <ImmiMateInput
            placeholder="e.g. Partner Visa, Aged Parent"
            value={form.visaStreamLabel}
            onChange={(e) => onChange("visaStreamLabel", e.target.value)}
            onBlur={onBlurSave}
          />
          <p className="text-[11px] text-slate-400 font-medium">
            Agreement will show: {form.matterType || "Matter Type"}
            {form.visaSubclass ? ` - ${form.visaSubclass}` : ""}
            {form.visaStreamLabel ? ` ${form.visaStreamLabel}` : ""}
          </p>
        </label>

        {matterConfig?.showSecondaryApplicant && (
          <>
            <label className="grid gap-2">
              <FieldLabel>Secondary Applicant Name</FieldLabel>
              <ImmiMateInput
                value={form.secondaryApplicantName}
                onChange={(e) => onChange("secondaryApplicantName", e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Secondary Applicant Email (for signing)</FieldLabel>
              <ImmiMateInput
                type="email"
                placeholder="Required if secondary applicant must sign"
                value={form.secondaryApplicantEmail}
                onChange={(e) => onChange("secondaryApplicantEmail", e.target.value)}
              />
            </label>
          </>
        )}

        {matterConfig?.showSponsor && (
          <>
            <label className="grid gap-2">
              <FieldLabel>Sponsor Name</FieldLabel>
              <ImmiMateInput
                value={form.sponsorName}
                onChange={(e) => onChange("sponsorName", e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Sponsor Email (for signing)</FieldLabel>
              <ImmiMateInput
                type="email"
                value={form.sponsorEmail}
                onChange={(e) => onChange("sponsorEmail", e.target.value)}
              />
            </label>
          </>
        )}

        {matterConfig?.showDependants && (
          <>
            {[1, 2, 3].map((n) => {
              const nameKey = `dependant${n}Name` as keyof AgreementWizardFormData
              const emailKey = `dependant${n}Email` as keyof AgreementWizardFormData
              return (
                <React.Fragment key={n}>
                  <label className="grid gap-2">
                    <FieldLabel>{`Dependant ${n} — Full Name`}</FieldLabel>
                    <ImmiMateInput
                      value={form[nameKey] as string}
                      onChange={(e) => onChange(nameKey, e.target.value)}
                    />
                  </label>
                  <label className="grid gap-2">
                    <FieldLabel>{`Dependant ${n} — Email (for signing)`}</FieldLabel>
                    <ImmiMateInput
                      type="email"
                      value={form[emailKey] as string}
                      onChange={(e) => onChange(emailKey, e.target.value)}
                    />
                  </label>
                </React.Fragment>
              )
            })}
          </>
        )}

        {(matterConfig?.fields || []).map((def) => (
          <MatterField
            key={def.key}
            def={def}
            value={form.matterFieldValues[def.key] || ""}
            onChange={(v) => handleFieldValueChange(def.key, v)}
          />
        ))}
      </div>

      <MatterTypesWorkflowModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={(list, selectedId) => {
          onMatterTypesUpdated(list, selectedId)
          if (selectedId) {
            const picked = list.find((m) => m.id === selectedId)
            if (picked) {
              onChange("matterTypeId", picked.id)
              onChange("matterType", picked.name)
              onChange("matterFieldValues", {})
            }
          }
        }}
      />

      <WizardNav
        showBack
        continueDisabled={!canContinue}
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  )
}
