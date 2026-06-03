"use client"

import React from "react"
import type { MatterTypeConfig } from "@/lib/settings/types"
import type { AgencyWizardContext, AgreementWizardFormData, RmaOption } from "../../../types/wizard"
import { generateProvisionalAgreementRef } from "../../../types/wizard"
import { buildAgreementPreviewHtml } from "../../../lib/agreement-preview-html"
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
  const selectedRma = rmaOptions.find((r) => r.id === form.responsibleRma) || rmaOptions.find((r) => r.isDefault) || rmaOptions[0] || null

  const html = buildAgreementPreviewHtml({
    form,
    agency,
    rma: selectedRma,
    agreementRef: agreementRef || generateProvisionalAgreementRef(agency.branding?.agreementRefPrefix || agency.slug),
    matterTypeConfig,
    selectedClauses,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#081B2E]">Preview</h2>
        <p className="text-sm text-slate-500 mt-1">Review the agreement before sending for signature.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 sm:p-6">
        <iframe
          title="Agreement Preview"
          srcDoc={html}
          className="w-full bg-white shadow-lg rounded-sm border-0 min-h-[720px]"
          sandbox=""
        />
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
