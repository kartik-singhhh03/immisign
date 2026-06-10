"use client"

import { Copy, GripVertical, Plus, Trash2 } from "lucide-react"
import { ImmiMateInput } from "@/components/ui/immimate-form"
import { Button } from "@/components/ui/button"
import type { AgreementFeeItemDraft, AgreementWizardFormData } from "../../../types/wizard"
import {
  calculateFeeTotals,
  createEmptyFeeItem,
  feesStepIsValid,
  formatCurrencyAud,
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
  onChange: (field: keyof AgreementWizardFormData, value: string | AgreementFeeItemDraft[]) => void
  onBlurSave?: () => void
  onBack: () => void
  onContinue: () => void
}

export function FeesStep({ form, onChange, onBlurSave, onBack, onContinue }: Props) {
  const items = form.feeItems || []
  const totals = calculateFeeTotals(items)
  const canContinue = feesStepIsValid(items)

  const setItems = (next: AgreementFeeItemDraft[]) => {
    onChange("feeItems", next)
  }

  const updateItem = (id: string, patch: Partial<AgreementFeeItemDraft>) => {
    setItems(items.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setItems([...items, createEmptyFeeItem(items.length)])
  }

  const deleteRow = (id: string) => {
    setItems(items.filter((row) => row.id !== id).map((row, i) => ({ ...row, sortOrder: i })))
  }

  const duplicateRow = (id: string) => {
    const source = items.find((row) => row.id === id)
    if (!source) return
    const copy: AgreementFeeItemDraft = {
      ...source,
      id: crypto.randomUUID(),
      description: source.description ? `${source.description} (copy)` : '',
      sortOrder: items.length,
    }
    setItems([...items, copy])
  }

  const moveRow = (id: string, direction: -1 | 1) => {
    const idx = items.findIndex((r) => r.id === id)
    if (idx < 0) return
    const swap = idx + direction
    if (swap < 0 || swap >= items.length) return
    const next = [...items]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setItems(next.map((row, i) => ({ ...row, sortOrder: i })))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Fees</h2>
        <p className="text-sm text-slate-500 mt-1">
          Build your fee structure with custom rows — amounts, categories, and due triggers.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-[28px_1.4fr_0.8fr_1fr_1fr_1fr_88px] gap-2 bg-[#fafbfc] border-b border-slate-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          <span />
          <span>Description</span>
          <span>Amount</span>
          <span>Due Trigger</span>
          <span>Category</span>
          <span>Notes</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No fee rows yet. Add your first line item.</p>
            </div>
          ) : (
            items.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 p-3 md:grid-cols-[28px_1.4fr_0.8fr_1fr_1fr_1fr_88px] md:gap-2 md:items-center"
              >
                <div className="hidden md:flex flex-col items-center gap-0.5 text-slate-300">
                  <button type="button" title="Reorder row" onClick={() => moveRow(row.id, -1)} className="hover:text-[#111111]">
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <label className="grid gap-1 md:contents">
                  <span className="md:hidden"><FieldLabel>Description</FieldLabel></span>
                  <ImmiMateInput
                    className="h-10"
                    placeholder="e.g. Professional Fee"
                    value={row.description}
                    onChange={(e) => updateItem(row.id, { description: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <label className="grid gap-1 md:contents">
                  <span className="md:hidden"><FieldLabel>Amount (AUD)</FieldLabel></span>
                  <ImmiMateInput
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-10"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => updateItem(row.id, { amount: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <label className="grid gap-1 md:contents">
                  <span className="md:hidden"><FieldLabel>Due Trigger</FieldLabel></span>
                  <ImmiMateInput
                    className="h-10"
                    placeholder="e.g. On Engagement"
                    value={row.dueTrigger}
                    onChange={(e) => updateItem(row.id, { dueTrigger: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <label className="grid gap-1 md:contents">
                  <span className="md:hidden"><FieldLabel>Category</FieldLabel></span>
                  <ImmiMateInput
                    className="h-10"
                    placeholder="e.g. Professional Fee"
                    value={row.category}
                    onChange={(e) => updateItem(row.id, { category: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <label className="grid gap-1 md:contents">
                  <span className="md:hidden"><FieldLabel>Notes</FieldLabel></span>
                  <ImmiMateInput
                    className="h-10"
                    placeholder="Optional"
                    value={row.notes}
                    onChange={(e) => updateItem(row.id, { notes: e.target.value })}
                    onBlur={onBlurSave}
                  />
                </label>
                <div className="flex items-center gap-1 justify-end">
                  <button type="button" onClick={() => duplicateRow(row.id)} className="p-2 text-slate-400 hover:text-[#111111]" title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => deleteRow(row.id)} className="p-2 text-slate-400 hover:text-rose-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="rounded-xl border-dashed border-slate-300 h-11 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Row
      </Button>

      <div className="rounded-2xl border border-[#111111]/20 bg-[#FAFAFA]/40 p-5 grid gap-3 sm:grid-cols-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Professional Fees</span>
          <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.professionalFees)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Government Fees</span>
          <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.governmentFees)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Disbursements</span>
          <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.disbursements)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[#111111]/10 pt-2 sm:border-0 sm:pt-0">
          <span className="font-bold text-[#111111]">Grand Total</span>
          <span className="font-black text-[#111111] text-base">{formatCurrencyAud(totals.grandTotal)}</span>
        </div>
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
