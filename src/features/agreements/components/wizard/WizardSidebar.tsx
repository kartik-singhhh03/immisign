"use client"

import * as React from "react"
import type { AutosaveStatus } from "@/components/ui/standards"
import type { AgreementWizardFormData, RmaOption } from "../../types/wizard"
import { calculateFeeTotals, formatCurrencyAud } from "../../lib/fee-items"

type Props = {
  form: AgreementWizardFormData
  agreementRef: string
  rmaOptions: RmaOption[]
  autosaveStatus: AutosaveStatus
  lastSavedAt: Date | null
  currentStep: number
  dispatched: boolean
}

const STEP_LABELS = ['Client', 'Matter', 'Fees', 'Terms', 'Preview', 'Send']

export function WizardSidebar({
  form,
  agreementRef,
  rmaOptions,
  autosaveStatus,
  lastSavedAt,
  currentStep,
  dispatched,
}: Props) {
  const totals = calculateFeeTotals(form.feeItems || [])
  const agent = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault)

  const saveLabel = React.useMemo(() => {
    if (autosaveStatus === 'saving') return 'Saving...'
    if (autosaveStatus === 'unsaved') return 'Unsaved changes'
    if (autosaveStatus === 'saved' && lastSavedAt) {
      const sec = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
      if (sec < 15) return 'Saved just now'
      return `Saved ${sec}s ago`
    }
    if (autosaveStatus === 'error') return 'Save failed'
    return 'Draft'
  }, [autosaveStatus, lastSavedAt])

  return (
    <aside className="hidden xl:block w-72 shrink-0">
      <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#111111]">Agreement</p>
          <p className="text-sm font-black text-[#111111] mt-1 break-all">{agreementRef}</p>
        </div>

        <dl className="space-y-3 text-xs">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Client</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{form.clientName || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Matter Type</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{form.matterType || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Subclass</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{form.visaSubclass || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Agent</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{agent?.name || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Status</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{dispatched ? 'Sent' : 'Draft'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Step</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{STEP_LABELS[currentStep] || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Last Saved</dt>
            <dd className="font-semibold text-[#111111] mt-0.5">{saveLabel}</dd>
          </div>
        </dl>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fee Totals</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Professional</span>
              <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.professionalFees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Government</span>
              <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.governmentFees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Disbursements</span>
              <span className="font-bold text-[#111111]">{formatCurrencyAud(totals.disbursements)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <span className="font-bold text-[#111111]">Grand Total</span>
              <span className="font-black text-[#111111]">{formatCurrencyAud(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
