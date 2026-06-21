"use client"

import { Plus, Trash2 } from "lucide-react"
import { ImmiMateInput } from "@/components/ui/immimate-form"
import { Button } from "@/components/ui/button"
import type {
  AgreementWizardFormData,
  GovernmentFeeDraft,
  ProfessionalFeeBlockDraft,
} from "../../../types/wizard"
import {
  calculateFeeTotals,
  createProfessionalFeeBlock,
  defaultGovernmentFees,
  feesStepIsValid,
  formatCurrencyAud,
  normalizeGovernmentFeesFromForm,
  normalizeProfessionalBlocksFromForm,
} from "../../../lib/fee-items"
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
  onChange: (
    field: keyof AgreementWizardFormData,
    value: string | ProfessionalFeeBlockDraft[] | GovernmentFeeDraft[],
  ) => void
  onBlurSave?: () => void
  onBack: () => void
  onContinue: () => void
}

export function FeesStep({ form, onChange, onBlurSave, onBack, onContinue }: Props) {
  const blocks =
    form.professionalFeeBlocks?.length > 0
      ? form.professionalFeeBlocks
      : normalizeProfessionalBlocksFromForm(form).length > 0
        ? normalizeProfessionalBlocksFromForm(form)
        : [createProfessionalFeeBlock(1)]

  const governmentFees =
    form.governmentFees?.length > 0 ? form.governmentFees : defaultGovernmentFees()

  const totals = calculateFeeTotals({ ...form, professionalFeeBlocks: blocks, governmentFees })
  const canContinue = feesStepIsValid({ ...form, professionalFeeBlocks: blocks, governmentFees })

  const setBlocks = (next: ProfessionalFeeBlockDraft[]) => {
    onChange("professionalFeeBlocks", next)
  }

  const setGovernmentFees = (next: GovernmentFeeDraft[]) => {
    onChange("governmentFees", next)
  }

  const updateBlock = (id: string, patch: Partial<ProfessionalFeeBlockDraft>) => {
    setBlocks(blocks.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addBlock = () => {
    const nextNumber = blocks.length ? Math.max(...blocks.map((b) => b.blockNumber)) + 1 : 1
    setBlocks([...blocks, createProfessionalFeeBlock(nextNumber)])
  }

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return
    const filtered = blocks.filter((row) => row.id !== id)
    setBlocks(filtered.map((row, i) => ({ ...row, blockNumber: i + 1 })))
  }

  const updateGovernmentFee = (id: string, amount: string) => {
    setGovernmentFees(governmentFees.map((g) => (g.id === id ? { ...g, amount } : g)))
  }

  const showProfessionalTotal = totals.professionalFees > 0
  const showGovernmentTotal = totals.governmentFees > 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Fees</h2>
        <p className="text-sm text-slate-500 mt-1">
          Professional fees (GST included) and government visa application charges.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Professional Fees</h3>
          <p className="text-xs text-slate-500 mt-0.5">Amounts are GST-inclusive. Visa fees are entered separately below.</p>
        </div>

        <div className="space-y-4">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#111111]">
                  Block {block.blockNumber}
                </span>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="p-2 text-slate-400 hover:text-rose-600"
                    title="Remove block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 sm:col-span-2">
                  <FieldLabel required>Description</FieldLabel>
                  <ImmiMateInput
                    className="h-10"
                    placeholder="e.g. Initial Consultation & File Preparation"
                    value={block.description}
                    onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel required>Amount (GST included)</FieldLabel>
                  <ImmiMateInput
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-10"
                    placeholder="0.00"
                    value={block.amount}
                    onChange={(e) => updateBlock(block.id, { amount: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addBlock}
          className="rounded-xl border-dashed border-slate-300 h-11 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Block {blocks.length + 1}
        </Button>
      </div>

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Government Fees</h3>
          <p className="text-xs text-slate-500 mt-0.5">Visa application charges — not subject to GST.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {governmentFees.map((fee) => (
            <div key={fee.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_160px] sm:items-center sm:gap-4">
              <span className="text-sm font-semibold text-[#111111]">{fee.label}</span>
              <ImmiMateInput
                type="number"
                min="0"
                step="0.01"
                className="h-10"
                placeholder="0.00"
                value={fee.amount}
                onChange={(e) => updateGovernmentFee(fee.id, e.target.value)}
                onBlur={onBlurSave}
              />
            </div>
          ))}
        </div>
      </div>

      {(showProfessionalTotal || showGovernmentTotal) && (
        <div className="rounded-2xl border border-[#111111]/20 bg-[#FAFAFA]/40 p-5 space-y-3">
          {showProfessionalTotal && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Professional Fees (GST included)</span>
              <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.professionalFees)}</span>
            </div>
          )}
          {showGovernmentTotal && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Government Fees</span>
              <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.governmentFees)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-[#111111]/10 pt-3">
            <span className="font-bold text-[#111111]">Grand Total</span>
            <span className="font-black text-[#111111] text-base">{formatCurrencyAud(totals.grandTotal)}</span>
          </div>
        </div>
      )}

      <WizardNav
        showBack
        continueDisabled={!canContinue}
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  )
}
