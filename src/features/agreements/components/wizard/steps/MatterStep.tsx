"use client"

import React from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

const selectClass =
  "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"

const inputClass =
  "h-11 rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"

type Props = {
  form: AgreementWizardFormData
  rmaOptions: RmaOption[]
  matterTypes: MatterTypeConfig[]
  agencySlug: string
  onChange: (field: keyof AgreementWizardFormData, value: string | boolean | Record<string, string>) => void
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
        <Textarea
          className="min-h-[88px] rounded-xl border-slate-200 bg-white text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
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
      <Input
        type={def.fieldType === "date" ? "date" : def.fieldType === "email" ? "email" : "text"}
        className={inputClass}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function MatterStep({ form, rmaOptions, matterTypes, agencySlug, onChange, onBack, onContinue }: Props) {
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
        <h2 className="text-xl font-bold text-[#081B2E]">Matter Details</h2>
        <p className="text-sm text-slate-500 mt-1">Configure the visa matter and applicant details.</p>
      </div>

      <label className="grid gap-2">
        <FieldLabel>Responsible Agent for this matter</FieldLabel>
        <select
          className={selectClass}
          value={form.responsibleRma}
          onChange={(e) => onChange("responsibleRma", e.target.value)}
        >
          <option value="">Select responsible agent...</option>
          {rmaOptions.map((rma) => (
            <option key={rma.id} value={rma.id}>
              {rma.name}{rma.isDefault ? " (Default)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel required>Matter Type</FieldLabel>
          <select
            className={selectClass}
            value={form.matterTypeId || form.matterType}
            onChange={(e) => handleMatterTypeChange(e.target.value)}
          >
            <option value="">Select matter type...</option>
            {matterTypes.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
          {matterTypes.length === 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No matter types found for this agency.{' '}
              <Link
                href={`/workspace/${agencySlug}/settings?section=Matter%20Types`}
                className="font-bold underline text-[#0D9F8C]"
              >
                Add matter types in Settings
              </Link>
              .
            </p>
          )}
        </label>
        <label className="grid gap-2">
          <FieldLabel>Visa Subclass</FieldLabel>
          <Input
            className={inputClass}
            placeholder={matterConfig?.subclassPlaceholder || "e.g. 820, 190, 482, 838"}
            value={form.visaSubclass}
            onChange={(e) => onChange("visaSubclass", e.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <FieldLabel>Primary Applicant Name</FieldLabel>
          <Input
            className={inputClass}
            value={form.primaryApplicantName}
            onChange={(e) => onChange("primaryApplicantName", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Primary Applicant Date of Birth</FieldLabel>
          <Input
            type="date"
            className={inputClass}
            value={form.primaryApplicantDob}
            onChange={(e) => onChange("primaryApplicantDob", e.target.value)}
          />
        </label>

        {matterConfig?.showSecondaryApplicant && (
          <>
            <label className="grid gap-2">
              <FieldLabel>Secondary Applicant Name</FieldLabel>
              <Input
                className={inputClass}
                value={form.secondaryApplicantName}
                onChange={(e) => onChange("secondaryApplicantName", e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Secondary Applicant Date of Birth</FieldLabel>
              <Input
                type="date"
                className={inputClass}
                value={form.secondaryApplicantDob}
                onChange={(e) => onChange("secondaryApplicantDob", e.target.value)}
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <FieldLabel>Secondary Applicant Email (for signing)</FieldLabel>
              <Input
                type="email"
                className={inputClass}
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
              <Input
                className={inputClass}
                value={form.sponsorName}
                onChange={(e) => onChange("sponsorName", e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Sponsor Email (for signing)</FieldLabel>
              <Input
                type="email"
                className={inputClass}
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
              const dobKey = `dependant${n}Dob` as keyof AgreementWizardFormData
              const emailKey = `dependant${n}Email` as keyof AgreementWizardFormData
              return (
                <React.Fragment key={n}>
                  <label className="grid gap-2">
                    <FieldLabel>{`Dependant ${n} — Full Name`}</FieldLabel>
                    <Input
                      className={inputClass}
                      value={form[nameKey] as string}
                      onChange={(e) => onChange(nameKey, e.target.value)}
                    />
                  </label>
                  <label className="grid gap-2">
                    <FieldLabel>{`Dependant ${n} — Date of Birth`}</FieldLabel>
                    <Input
                      type="date"
                      className={inputClass}
                      value={form[dobKey] as string}
                      onChange={(e) => onChange(dobKey, e.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <FieldLabel>{`Dependant ${n} — Email (for signing)`}</FieldLabel>
                    <Input
                      type="email"
                      className={inputClass}
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

        <label className="grid gap-2">
          <FieldLabel>File / Lodgement Ref</FieldLabel>
          <Input
            className={inputClass}
            value={form.fileLodgementRef}
            onChange={(e) => onChange("fileLodgementRef", e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Agreement Date</FieldLabel>
          <Input
            className={`${inputClass} max-w-xs`}
            placeholder="DD/MM/YYYY"
            value={form.agreementDate}
            onChange={(e) => onChange("agreementDate", e.target.value)}
          />
        </label>
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
