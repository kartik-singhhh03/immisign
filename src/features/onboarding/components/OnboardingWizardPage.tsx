"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PhoneInput } from "@/components/ui/phone-input"
import {
  ImmiMateFieldSelect,
  ImmiMateInput,
  ImmiMateTextarea,
} from "@/components/ui/immimate-form"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import type {
  AssignableAgent,
  FinancialSetupInput,
  MatterDetailsInput,
  OnboardingPriority,
  PrimaryApplicantInput,
  SecondaryApplicantInput,
} from "../types"

const STEPS = [
  "Primary Applicant",
  "Secondary Applicant",
  "Matter Details",
  "Financial Setup",
  "Review",
] as const

const PRIORITIES: { value: OnboardingPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
  )
}


export function OnboardingWizardPage({ agencySlug }: { agencySlug: string }) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [matterTypes, setMatterTypes] = React.useState<{ id: string; name: string; show_secondary_applicant?: boolean }[]>([])
  const [agents, setAgents] = React.useState<AssignableAgent[]>([])
  const [surchargePercent, setSurchargePercent] = React.useState<number | null>(null)
  const [savedClientNumber, setSavedClientNumber] = React.useState<string | null>(null)

  const [primary, setPrimary] = React.useState<PrimaryApplicantInput>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    mobile: "",
    address: "",
  })
  const [hasSecondary, setHasSecondary] = React.useState(false)
  const [secondary, setSecondary] = React.useState<SecondaryApplicantInput>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    mobile: "",
  })
  const [matter, setMatter] = React.useState<MatterDetailsInput>({
    matterTypeId: "",
    visaSubclass: "",
    visaStream: "",
    assignedAgentId: "",
    priority: "normal",
  })
  const [financial, setFinancial] = React.useState<FinancialSetupInput>({
    professionalFee: 0,
    deposit: 0,
    visaFees: 0,
  })

  React.useEffect(() => {
    fetch("/api/onboarding/options")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setMatterTypes(j.matterTypes || [])
          setAgents(j.agents || [])
          setSurchargePercent(j.surchargePercent ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const surchargeAmount =
    surchargePercent != null && surchargePercent > 0
      ? Math.round(financial.visaFees * (surchargePercent / 100) * 100) / 100
      : 0
  const totalGovernment = financial.visaFees + surchargeAmount

  const canStep0 =
    primary.firstName.trim() &&
    primary.lastName.trim() &&
    primary.dateOfBirth &&
    primary.email.trim() &&
    primary.mobile.trim() &&
    primary.address.trim()

  const canStep1 =
    !hasSecondary ||
    (secondary.firstName.trim() &&
      secondary.lastName.trim() &&
      secondary.dateOfBirth &&
      secondary.email.trim() &&
      secondary.mobile.trim())

  const canStep2 =
    matter.matterTypeId &&
    matter.visaSubclass.trim() &&
    matter.visaStream.trim() &&
    matter.assignedAgentId

  const canStep3 =
    financial.professionalFee >= 0 &&
    financial.deposit >= 0 &&
    financial.visaFees >= 0

  const canContinue = [canStep0, canStep1, canStep2, canStep3, true][step]

  const selectedMatterType = matterTypes.find((m) => m.id === matter.matterTypeId)
  const selectedAgent = agents.find((a) => a.id === matter.assignedAgentId)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary,
          hasSecondary,
          secondary: hasSecondary ? secondary : null,
          matter,
          financial,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")
      setSavedClientNumber(json.clientNumber)
      router.push(json.deepLink)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 font-semibold">
        Loading onboarding…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-enter">
      <Link
        href={`/workspace/${agencySlug}/clients`}
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Clients
      </Link>

      <PageHeader
        variant="wizard"
        eyebrow="Unified Intake"
        title="New Client & Matter"
        description="Capture client, applicants, matter, and fees in one workflow."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border",
              i === step
                ? "border-[#111111] bg-[#FAFAFA] text-[#111111] shadow-sm"
                : i < step
                  ? "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]"
                  : "border-slate-200 bg-white text-slate-400",
            )}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            {label}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        {step === 0 && (
          <>
            <h2 className="text-xl font-bold text-[#111111]">Primary Applicant</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <FieldLabel required>First Name</FieldLabel>
                <ImmiMateInput value={primary.firstName} onChange={(e) => setPrimary({ ...primary, firstName: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Last Name</FieldLabel>
                <ImmiMateInput value={primary.lastName} onChange={(e) => setPrimary({ ...primary, lastName: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Date of Birth</FieldLabel>
                <ImmiMateInput type="date" value={primary.dateOfBirth} onChange={(e) => setPrimary({ ...primary, dateOfBirth: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Email</FieldLabel>
                <ImmiMateInput type="email" value={primary.email} onChange={(e) => setPrimary({ ...primary, email: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Mobile Number</FieldLabel>
                <PhoneInput value={primary.mobile} onChange={(v) => setPrimary({ ...primary, mobile: v })} />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <FieldLabel required>Address</FieldLabel>
                <ImmiMateTextarea className="min-h-[88px]" value={primary.address} onChange={(e) => setPrimary({ ...primary, address: e.target.value })} />
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-[#111111]">Secondary Applicant</h2>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={hasSecondary} onChange={(e) => setHasSecondary(e.target.checked)} className="rounded" />
              Has Secondary Applicant?
            </label>
            {hasSecondary && (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <FieldLabel required>First Name</FieldLabel>
                  <ImmiMateInput value={secondary.firstName} onChange={(e) => setSecondary({ ...secondary, firstName: e.target.value })} />
                </label>
                <label className="grid gap-2">
                  <FieldLabel required>Last Name</FieldLabel>
                  <ImmiMateInput value={secondary.lastName} onChange={(e) => setSecondary({ ...secondary, lastName: e.target.value })} />
                </label>
                <label className="grid gap-2">
                  <FieldLabel required>Date of Birth</FieldLabel>
                  <ImmiMateInput type="date" value={secondary.dateOfBirth} onChange={(e) => setSecondary({ ...secondary, dateOfBirth: e.target.value })} />
                </label>
                <label className="grid gap-2">
                  <FieldLabel required>Email</FieldLabel>
                  <ImmiMateInput type="email" value={secondary.email} onChange={(e) => setSecondary({ ...secondary, email: e.target.value })} />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <FieldLabel required>Mobile</FieldLabel>
                  <PhoneInput value={secondary.mobile} onChange={(v) => setSecondary({ ...secondary, mobile: v })} />
                </label>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[#111111]">Matter Details</h2>
            {matterTypes.length === 0 && (
              <p className="text-sm text-amber-700 font-semibold rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                No matter types configured. Add matter types in Settings before onboarding.
              </p>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <FieldLabel required>Matter Type</FieldLabel>
                <ImmiMateFieldSelect
                  value={matter.matterTypeId}
                  onValueChange={(v) => setMatter({ ...matter, matterTypeId: v })}
                  placeholder="Select matter type…"
                  options={matterTypes.map((mt) => ({ value: mt.id, label: mt.name }))}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Visa Subclass</FieldLabel>
                <ImmiMateInput placeholder="e.g. 190, 820, AAT" value={matter.visaSubclass} onChange={(e) => setMatter({ ...matter, visaSubclass: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Visa Stream</FieldLabel>
                <ImmiMateInput placeholder="e.g. Skilled, Partner" value={matter.visaStream} onChange={(e) => setMatter({ ...matter, visaStream: e.target.value })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Assigned Agent</FieldLabel>
                <ImmiMateFieldSelect
                  value={matter.assignedAgentId}
                  onValueChange={(v) => setMatter({ ...matter, assignedAgentId: v })}
                  placeholder="Select agent…"
                  options={agents.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.roleLabel})`,
                  }))}
                />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Priority</FieldLabel>
                <ImmiMateFieldSelect
                  value={matter.priority}
                  onValueChange={(v) => setMatter({ ...matter, priority: v as OnboardingPriority })}
                  options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
                />
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-[#111111]">Financial Setup</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <FieldLabel required>Professional Fees ($)</FieldLabel>
                <ImmiMateInput type="number" min={0} step="0.01" value={financial.professionalFee || ""} onChange={(e) => setFinancial({ ...financial, professionalFee: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Deposit ($)</FieldLabel>
                <ImmiMateInput type="number" min={0} step="0.01" value={financial.deposit || ""} onChange={(e) => setFinancial({ ...financial, deposit: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <FieldLabel required>Visa Fees ($)</FieldLabel>
                <ImmiMateInput type="number" min={0} step="0.01" value={financial.visaFees || ""} onChange={(e) => setFinancial({ ...financial, visaFees: parseFloat(e.target.value) || 0 })} />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span>Visa Fees</span><span className="font-bold">${financial.visaFees.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span>Surcharge{surchargePercent != null ? ` (${surchargePercent}%)` : ""}</span>
                <span className="font-bold">${surchargeAmount.toFixed(2)}</span>
              </div>
              {surchargePercent == null && (
                <p className="text-xs text-amber-700">Configure Card Processing Surcharge % in Settings → Financial Settings.</p>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[#111111]">
                <span>Total Government Charges</span>
                <span>${totalGovernment.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-xl font-bold text-[#111111]">Review</h2>
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Primary Applicant</p>
                <p className="font-bold">{primary.firstName} {primary.lastName}</p>
                <p className="text-slate-600">{primary.email} · {primary.mobile}</p>
                <p className="text-slate-600">DOB: {primary.dateOfBirth}</p>
                <p className="text-slate-600">{primary.address}</p>
              </div>
              {hasSecondary && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Secondary Applicant</p>
                  <p className="font-bold">{secondary.firstName} {secondary.lastName}</p>
                  <p className="text-slate-600">{secondary.email}</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Matter</p>
                <p>{selectedMatterType?.name} · SC{matter.visaSubclass} · {matter.visaStream}</p>
                <p>Agent: {selectedAgent?.name} · Priority: {matter.priority}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Financials</p>
                <p>Professional: ${financial.professionalFee.toFixed(2)} · Deposit: ${financial.deposit.toFixed(2)}</p>
                <p>Government total: ${totalGovernment.toFixed(2)}</p>
              </div>
              {savedClientNumber && (
                <p className="text-[#111111] font-bold">Client Number: {savedClientNumber}</p>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="text-sm font-semibold text-rose-600 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">{error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" className="rounded-xl" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" className="rounded-xl bg-[#111111]" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" className="rounded-xl bg-[#111111]" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save Client & Matter"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
