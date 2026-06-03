"use client"



import React from "react"

import { Card } from "@/components/ui/card"

import type { AgencyWizardContext, AgreementWizardFormData, RmaOption, UserWizardContext } from "../../types/wizard"

import { createInitialWizardForm, generateProvisionalAgreementRef } from "../../types/wizard"

import { WizardStepper } from "./WizardStepper"

import { ClientStep } from "./steps/ClientStep"

import { MatterStep } from "./steps/MatterStep"

import { FeesStep } from "./steps/FeesStep"

import { TermsStep } from "./steps/TermsStep"

import { PreviewStep } from "./steps/PreviewStep"

import { SendStep } from "./steps/SendStep"

import type { AgencySettings } from '@/lib/settings/types'

import { defaultSelectedClauseIds, resolveSelectedClauses } from '@/lib/settings/load-agency-settings'



type Props = {
  agencyId: string
  agencySlug: string
  userId: string
  agency: AgencyWizardContext
  user: UserWizardContext
  rmaOptions: RmaOption[]
  agencySettings: AgencySettings
}

function resolveMatterTypeConfig(settings: AgencySettings, form: AgreementWizardFormData) {

  if (form.matterTypeId) {

    return settings.matterTypes.find((m) => m.id === form.matterTypeId) || null

  }

  return settings.matterTypes.find((m) => m.name === form.matterType) || null

}



export function AgreementWizard({ agencyId, agencySlug, userId, agency, user, rmaOptions, agencySettings }: Props) {

  const [currentStep, setCurrentStep] = React.useState(0)

  const [saving, setSaving] = React.useState(false)

  const [dispatched, setDispatched] = React.useState(false)

  const [apiResponse, setApiResponse] = React.useState<any>(null)

  const [apiError, setApiError] = React.useState<string | null>(null)

  const [agreementRef] = React.useState(() =>

    generateProvisionalAgreementRef(agencySettings.branding.agreementRefPrefix || agencySlug)

  )



  const [formData, setFormData] = React.useState<AgreementWizardFormData>(() => {

    const initial = createInitialWizardForm(user, agency, {

      defaults: agencySettings.defaults,

      defaultSelectedClauseIds: defaultSelectedClauseIds(agencySettings),

    })

    const defaultRma = rmaOptions.find((r) => r.isDefault) || rmaOptions[0]

    if (defaultRma) initial.responsibleRma = defaultRma.id

    return initial

  })



  React.useEffect(() => {

    let cancelled = false

    async function loadDraft() {

      try {

        const res = await fetch('/api/agreements/wizard-draft')

        if (res.ok) {

          const { draft } = await res.json()

          if (!cancelled && draft?.form_data) {

            setFormData((prev) => ({

              ...prev,

              ...draft.form_data,

              matterFieldValues: draft.form_data.matterFieldValues || {},

              selectedClauseIds: draft.form_data.selectedClauseIds?.length

                ? draft.form_data.selectedClauseIds

                : prev.selectedClauseIds,

            }))

            if (typeof draft.current_step === 'number') setCurrentStep(draft.current_step)

            return

          }

        }

      } catch {
        // Draft API unavailable — start fresh
      }
    }

    loadDraft()

    return () => { cancelled = true }

  }, [agencyId])



  React.useEffect(() => {
    const timer = setTimeout(() => {

      fetch('/api/agreements/wizard-draft', {

        method: 'PUT',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ formData, currentStep, agreementRef }),

      }).catch(() => {})

    }, 800)

    return () => clearTimeout(timer)

  }, [formData, currentStep, agreementRef, agencyId])



  React.useEffect(() => {

    if (!formData.primaryApplicantName && formData.clientName) {

      setFormData((prev) => ({ ...prev, primaryApplicantName: prev.clientName }))

    }

  }, [formData.clientName, formData.primaryApplicantName])



  const handleFieldChange = (

    field: keyof AgreementWizardFormData,

    value: string | boolean | string[] | Record<string, string>

  ) => {

    setFormData((prev) => ({ ...prev, [field]: value }))

  }



  const matterTypeConfig = resolveMatterTypeConfig(agencySettings, formData)

  const selectedClauses = resolveSelectedClauses(agencySettings, formData.selectedClauseIds).map((c) => ({

    title: c.title,

    content: c.content,

    orderIndex: c.orderIndex,

  }))



  const handleSend = async () => {

    try {

      setSaving(true)

      setApiError(null)



      const payload = {

        agreementRef,

        agencySnapshot: agency,

        selectedClauses,

        selectedClauseIds: formData.selectedClauseIds,

        matterTypeConfig,

        formData: {

          ...formData,

          primaryApplicantName: formData.primaryApplicantName || formData.clientName,

        },

        dispatchOptions: {

          ccMe: formData.ccMe,

          autoRemind7Days: formData.autoRemind7Days,

          emailOnComplete: formData.emailOnComplete,

          emailMessage: formData.emailMessage,

          responsibleRmaId: formData.responsibleRma,

        },

      }



      const res = await fetch("/api/agreements/standard", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      })



      const data = await res.json()



      if (!res.ok) {

        if (data.agreementId && data.stage === "pdf_generation_failed") {

          throw new Error(

            `${data.error} (Agreement ${data.agreementId} saved as draft — you can retry from the agreements list.)`

          )

        }

        throw new Error(data.error || `HTTP ${res.status}`)

      }



      if (!data.success) {

        throw new Error(data.error || "Agreement dispatch failed")

      }



      fetch('/api/agreements/wizard-draft', { method: 'DELETE' }).catch(() => {})

      setApiResponse(data)

      setDispatched(true)

    } catch (e: unknown) {

      const err = e as Error

      setApiError(err.message || "Failed to send agreement.")

    } finally {

      setSaving(false)

    }

  }



  return (

    <div className="animate-enter space-y-6 max-w-4xl mx-auto px-4 pb-10">

      <div className="text-center sm:text-left">

        <p className="text-xs font-bold uppercase tracking-widest text-[#0D9F8C]">New Agreement</p>

        <h1 className="text-2xl font-black text-[#081B2E] mt-1">Agreement Setup Wizard</h1>

        <p className="text-sm text-slate-500 mt-1">Create a MARA-compliant service agreement in six steps.</p>

      </div>



      <WizardStepper currentStep={currentStep} hidden={dispatched} />



      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="p-6 sm:p-8">

          {currentStep === 0 && (

            <ClientStep

              form={formData}

              onChange={handleFieldChange}

              onContinue={() => setCurrentStep(1)}

            />

          )}

          {currentStep === 1 && (

            <MatterStep

              form={formData}

              rmaOptions={rmaOptions}

              matterTypes={agencySettings.matterTypes}

              onChange={handleFieldChange}

              onBack={() => setCurrentStep(0)}

              onContinue={() => setCurrentStep(2)}

            />

          )}

          {currentStep === 2 && (

            <FeesStep

              form={formData}

              agencySlug={agencySlug}

              paymentScheduleOptions={agencySettings.paymentSchedules}

              onChange={handleFieldChange}

              onBack={() => setCurrentStep(1)}

              onContinue={() => setCurrentStep(3)}

            />

          )}

          {currentStep === 3 && (

            <TermsStep

              form={formData}

              clauses={agencySettings.clauses}

              onChange={handleFieldChange}

              onBack={() => setCurrentStep(2)}

              onContinue={() => setCurrentStep(4)}

            />

          )}

          {currentStep === 4 && (

            <PreviewStep

              form={formData}

              agency={agency}

              rmaOptions={rmaOptions}

              agreementRef={agreementRef}

              matterTypeConfig={matterTypeConfig}

              selectedClauses={selectedClauses}

              onBack={() => setCurrentStep(3)}

              onContinue={() => setCurrentStep(5)}

            />

          )}

          {currentStep === 5 && (

            <SendStep

              form={formData}

              agency={agency}

              rmaOptions={rmaOptions}

              agreementRef={agreementRef}

              saving={saving}

              dispatched={dispatched}

              apiError={apiError}

              apiResponse={apiResponse}

              agencySlug={agencySlug}

              onChange={handleFieldChange}

              onBack={() => setCurrentStep(4)}

              onSend={handleSend}

            />

          )}

        </div>

      </Card>

    </div>

  )

}


