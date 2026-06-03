"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import type { AgencySettings } from "@/lib/settings/types"
import type { AgreementWizardFormData } from "../../../types/wizard"
import { WizardNav } from "../WizardNav"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</span>
  )
}

const textareaClass =
  "flex min-h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0D9F8C] resize-y"

type Props = {
  form: AgreementWizardFormData
  clauses: AgencySettings['clauses']
  onChange: (field: keyof AgreementWizardFormData, value: string | boolean | string[]) => void
  onBack: () => void
  onContinue: () => void
}

export function TermsStep({ form, clauses, onChange, onBack, onContinue }: Props) {
  const canContinue = Boolean(form.scopeOfServices.trim())
  const selectedSet = new Set(form.selectedClauseIds)

  const orderedClauses = form.selectedClauseIds
    .map((id) => clauses.find((c) => c.id === id))
    .filter(Boolean) as AgencySettings['clauses']

  const toggleClause = (id: string, mandatory: boolean) => {
    if (mandatory) return
    if (selectedSet.has(id)) {
      onChange('selectedClauseIds', form.selectedClauseIds.filter((x) => x !== id))
    } else {
      onChange('selectedClauseIds', [...form.selectedClauseIds, id])
    }
  }

  const moveClause = (id: string, direction: -1 | 1) => {
    const idx = form.selectedClauseIds.indexOf(id)
    if (idx < 0) return
    const next = idx + direction
    if (next < 0 || next >= form.selectedClauseIds.length) return
    const ids = [...form.selectedClauseIds]
    ;[ids[idx], ids[next]] = [ids[next], ids[idx]]
    onChange('selectedClauseIds', ids)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#081B2E]">Terms</h2>
        <p className="text-sm text-slate-500 mt-1">Define scope of services, special terms, and agreement clauses.</p>
      </div>

      <label className="grid gap-2">
        <FieldLabel>Scope of Services</FieldLabel>
        <textarea
          className={textareaClass}
          value={form.scopeOfServices}
          onChange={(e) => onChange("scopeOfServices", e.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <FieldLabel>Special Terms</FieldLabel>
        <textarea
          className={textareaClass}
          placeholder="Enter any additional or special terms (optional)"
          value={form.specialTerms}
          onChange={(e) => onChange("specialTerms", e.target.value)}
        />
      </label>

      <div className="space-y-3">
        <FieldLabel>Agreement Clauses</FieldLabel>
        <p className="text-xs text-slate-400 font-medium">Enable, disable, and reorder clauses included in the preview and PDF.</p>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {clauses.map((clause) => {
            const enabled = selectedSet.has(clause.id)
            const orderIdx = form.selectedClauseIds.indexOf(clause.id)
            return (
              <div key={clause.id} className="flex items-start gap-3 p-3 bg-white">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={clause.isMandatory}
                  onChange={() => toggleClause(clause.id, clause.isMandatory)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0D9F8C] focus:ring-[#0D9F8C]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#081B2E]">{clause.title}</div>
                  {clause.isMandatory && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Mandatory</span>
                  )}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{clause.content}</p>
                </div>
                {enabled && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={orderIdx <= 0}
                      onClick={() => moveClause(clause.id, -1)}
                      className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={orderIdx >= form.selectedClauseIds.length - 1}
                      onClick={() => moveClause(clause.id, 1)}
                      className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {enabled && (
                  <GripVertical className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                )}
              </div>
            )
          })}
          {!clauses.length && (
            <div className="p-4 text-xs text-slate-400 text-center">No clauses configured — add clauses in Settings.</div>
          )}
        </div>
        {orderedClauses.length > 0 && (
          <p className="text-[11px] text-slate-400 font-semibold">
            {orderedClauses.length} clause{orderedClauses.length === 1 ? '' : 's'} will appear after Section 3 in the agreement.
          </p>
        )}
      </div>

      <WizardNav
        showBack
        continueLabel="Preview Agreement"
        continueDisabled={!canContinue}
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  )
}
