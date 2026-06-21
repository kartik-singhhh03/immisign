"use client"

import React from "react"
import type { MatterTypeConfig } from "@/lib/settings/types"
import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from "../../../types/wizard"
import { calculateFeeTotals, formatCurrencyAud } from "../../../lib/fee-items"
import { AgreementPdfViewer } from "../AgreementPdfViewer"
import { WizardNav } from "../WizardNav"

type Props = {
  form: AgreementWizardFormData
  agency: AgencyWizardContext
  rmaOptions: RmaOption[]
  agreementRef: string
  matterTypeConfig?: MatterTypeConfig | null
  selectedClauses?: Array<{ title: string; content: string }>
  onBack: () => void
  onContinue: () => void
}

export function PreviewStep({
  form,
  agency,
  rmaOptions,
  agreementRef,
  matterTypeConfig,
  selectedClauses = [],
  onBack,
  onContinue,
}: Props) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const selectedRma = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault) || rmaOptions[0] || null
  const totals = calculateFeeTotals(form)

  React.useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    async function loadPdf() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/agreements/preview-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form,
            agency,
            rma: selectedRma,
            agreementRef,
            matterTypeConfig,
            selectedClauses,
          }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || `Preview failed (${res.status})`)
        }
        const blob = await res.blob()
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        revoked = url
        setPdfUrl(url)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load PDF preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [form, agency, selectedRma, agreementRef, matterTypeConfig, selectedClauses])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111111]">Document Review</h2>
        <p className="text-sm text-slate-500 mt-1">Review the full agreement PDF before sending for signature.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] min-h-[560px]">
        <aside className="rounded-2xl border border-slate-200 bg-[#fafbfc] p-5 space-y-4 h-fit lg:sticky lg:top-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</p>
            <p className="text-sm font-black text-[#111111] mt-1 break-all">{agreementRef}</p>
          </div>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Client</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">{form.clientName || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Matter Type</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">{form.matterType || matterTypeConfig?.name || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Subclass</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">{form.visaSubclass || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Agent</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">{selectedRma?.name || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Agreement Date</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">{form.agreementDate || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="font-semibold text-[#111111] mt-0.5">Draft Preview</dd>
            </div>
          </dl>
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wide text-slate-400">Fee Summary</p>
            {totals.professionalFees > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Professional</span><span className="font-bold">{formatCurrencyAud(totals.professionalFees)}</span></div>
            )}
            {totals.governmentFees > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Government</span><span className="font-bold">{formatCurrencyAud(totals.governmentFees)}</span></div>
            )}
            {(totals.professionalFees > 0 || totals.governmentFees > 0) && (
            <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-[#111111]">
              <span>Total</span><span>{formatCurrencyAud(totals.grandTotal)}</span>
            </div>
            )}
          </div>
        </aside>

        <AgreementPdfViewer pdfUrl={pdfUrl} loading={loading} error={error} />
      </div>

      <WizardNav
        showBack
        continueLabel="Proceed to Send"
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  )
}
