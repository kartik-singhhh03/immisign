"use client"



import React from "react"

import { Card } from "@/components/ui/card"

import type { AgencyWizardContext, AgreementWizardFormData, ClientPickerOption, RmaOption, UserWizardContext } from "../../types/wizard"

import { createInitialWizardForm, generateProvisionalAgreementRef } from "../../types/wizard"

import { WizardStepper } from "./WizardStepper"
import { AutosaveIndicator, type AutosaveStatus } from "@/components/ui/standards"
import { notifyError, notifySuccess } from "@/lib/ux/feedback"
import type { DispatchStageRecord } from "@/lib/dispatch/stage-tracker"
import {
  createAgreementSendTimeline,
  markTimelineRunning,
  mergeServerDispatchStages,
} from "@/lib/dispatch/client-timeline"
import { animateTimelineCompletion } from "@/lib/dispatch/animate-timeline"

import { PageHeader } from "@/components/layout/PageHeader"
import { ClientStep } from "./steps/ClientStep"

import { MatterStep } from "./steps/MatterStep"

import { FeesStep } from "./steps/FeesStep"

import { TermsStep } from "./steps/TermsStep"

import { PreviewStep } from "./steps/PreviewStep"

import { SendStep } from "./steps/SendStep"
import { WizardSidebar } from "./WizardSidebar"

import type { AgencySettings, MatterTypeConfig } from '@/lib/settings/types'
import type { AgreementFeeItemDraft } from "../../types/wizard"
import { normalizeFeeItemsFromForm } from "../../lib/fee-items"

import { defaultSelectedClauseIds, resolveSelectedClauses } from '@/lib/settings/load-agency-settings'



type Props = {
  agencyId: string
  agencySlug: string
  userId: string
  agency: AgencyWizardContext
  user: UserWizardContext
  rmaOptions: RmaOption[]
  agencySettings: AgencySettings
  clients?: ClientPickerOption[]
  initialClientId?: string
  /** When true, restore saved wizard draft step. Default false = always start Step 1. */
  resumeDraft?: boolean
}

function resolveMatterTypeConfig(settings: AgencySettings, form: AgreementWizardFormData) {

  if (form.matterTypeId) {

    return settings.matterTypes.find((m) => m.id === form.matterTypeId) || null

  }

  return settings.matterTypes.find((m) => m.name === form.matterType) || null

}



export function AgreementWizard({
  agencyId,
  agencySlug,
  userId,
  agency,
  user,
  rmaOptions,
  agencySettings,
  clients = [],
  initialClientId,
  resumeDraft = false,
}: Props) {

  const [currentStep, setCurrentStep] = React.useState(0)
  const [draftReady, setDraftReady] = React.useState(!resumeDraft)

  const [saving, setSaving] = React.useState(false)
  const [dispatchStages, setDispatchStages] = React.useState<DispatchStageRecord[]>([])
  const [dispatchSupportRef, setDispatchSupportRef] = React.useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = React.useState<AutosaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = React.useRef(false)
  const pendingBlurSaveRef = React.useRef(false)

  const [matterTypes, setMatterTypes] = React.useState<MatterTypeConfig[]>(agencySettings.matterTypes)

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

    if (initialClientId) {
      const picked = clients.find((c) => c.id === initialClientId)
      if (picked) {
        initial.clientId = picked.id
        initial.clientName = picked.name
        initial.clientEmail = picked.email
        initial.clientPhone = picked.phone || ''
      }
    }

    return initial

  })



  React.useEffect(() => {

    let cancelled = false

    async function initDraft() {

      try {

        if (!resumeDraft) {
          await fetch('/api/agreements/wizard-draft', { method: 'DELETE' })
          if (!cancelled) {
            setCurrentStep(0)
            setDraftReady(true)
          }
          return
        }

        const res = await fetch('/api/agreements/wizard-draft')

        if (res.ok) {

          const { draft } = await res.json()

          if (!cancelled && draft?.form_data) {

            setFormData((prev) => {
              const merged = {
                ...prev,
                ...draft.form_data,
                matterFieldValues: draft.form_data.matterFieldValues || {},
                selectedClauseIds: draft.form_data.selectedClauseIds?.length
                  ? draft.form_data.selectedClauseIds
                  : prev.selectedClauseIds,
              }
              merged.feeItems = normalizeFeeItemsFromForm(merged)
              return merged
            })

            if (typeof draft.current_step === 'number') {
              setCurrentStep(Math.min(Math.max(0, draft.current_step), 4))
            }

          }

        }

      } catch {
        // Draft API unavailable — start fresh
      } finally {
        if (!cancelled) setDraftReady(true)
      }
    }

    void initDraft()

    return () => { cancelled = true }

  }, [agencyId, resumeDraft])



  const persistDraft = React.useCallback(async () => {
    if (dispatched || saveInFlightRef.current || !draftReady) return
    saveInFlightRef.current = true
    setAutosaveStatus("saving")
    try {
      const res = await fetch('/api/agreements/wizard-draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, currentStep, agreementRef }),
      })
      if (res.ok) {
        setAutosaveStatus("saved")
        setLastSavedAt(new Date())
      } else {
        setAutosaveStatus("error")
      }
    } catch {
      setAutosaveStatus("error")
    } finally {
      saveInFlightRef.current = false
      if (pendingBlurSaveRef.current) {
        pendingBlurSaveRef.current = false
        void persistDraft()
      }
    }
  }, [formData, currentStep, agreementRef, dispatched, draftReady])

  const handleBlurSave = React.useCallback(() => {
    if (dispatched) return
    if (saveInFlightRef.current) {
      pendingBlurSaveRef.current = true
      return
    }
    void persistDraft()
  }, [dispatched, persistDraft])

  React.useEffect(() => {
    if (dispatched || !draftReady) return
    setAutosaveStatus("unsaved")
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void persistDraft()
    }, 3000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [formData, currentStep, agreementRef, agencyId, dispatched, persistDraft, draftReady])



  React.useEffect(() => {

    if (!formData.primaryApplicantName && formData.clientName) {

      setFormData((prev) => ({ ...prev, primaryApplicantName: prev.clientName }))

    }

  }, [formData.clientName, formData.primaryApplicantName])



  const handleFieldChange = (
    field: keyof AgreementWizardFormData,
    value: string | boolean | string[] | Record<string, string> | AgreementFeeItemDraft[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleMatterTypesUpdated = (list: MatterTypeConfig[], selectedId?: string) => {
    setMatterTypes(list)
    if (selectedId) {
      const picked = list.find((m) => m.id === selectedId)
      if (picked) {
        setFormData((prev) => ({
          ...prev,
          matterTypeId: picked.id,
          matterType: picked.name,
          matterFieldValues: {},
        }))
      }
    }
  }

  const matterTypeConfig = resolveMatterTypeConfig({ ...agencySettings, matterTypes }, formData)

  const selectedClauses = resolveSelectedClauses(agencySettings, formData.selectedClauseIds).map((c) => ({

    title: c.title,

    content: c.content,

    orderIndex: c.orderIndex,

  }))



  const handleSend = async () => {
    try {
      setSaving(true)
      setApiError(null)
      setDispatchSupportRef(null)
      let stages = createAgreementSendTimeline()
      stages = markTimelineRunning(stages, "agreement")
      setDispatchStages(stages)

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



      const data = await (async () => {
          const res = await fetch("/api/agreements/standard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (!res.ok) {
            const err = new Error(
              json.error ||
                (json.stage === "pdf_generation_failed"
                  ? `${json.error} (Agreement ${json.agreementId} saved as draft.)`
                  : `HTTP ${res.status}`),
            ) as Error & { stages?: DispatchStageRecord[]; supportRef?: string }
            err.stages = json.stages
            err.supportRef = json.supportRef
            throw err
          }
          if (!json.success) {
            throw new Error(json.error || "Agreement dispatch failed")
          }
          if (!json.signwellResult?.id) {
            throw new Error("SignWell did not return a document id. Agreement was not sent.")
          }
          return json
        })()



      if (data.supportRef) setDispatchSupportRef(data.supportRef)
      const merged = data.stages?.length
        ? mergeServerDispatchStages(stages, data.stages)
        : stages.map((s) => ({ ...s, status: "success" as const, completedAt: new Date().toISOString() }))

      await animateTimelineCompletion(stages, merged, setDispatchStages)
      await new Promise((r) => setTimeout(r, 400))

      fetch("/api/agreements/wizard-draft", { method: "DELETE" }).catch(() => {})
      setApiResponse(data)
      setDispatched(true)
      notifySuccess("Agreement sent", "PDF generated and signature request dispatched.")
    } catch (e: unknown) {
      const err = e as Error & { stages?: DispatchStageRecord[]; supportRef?: string }
      if (err.supportRef) setDispatchSupportRef(err.supportRef)
      if (err.stages?.length) setDispatchStages(mergeServerDispatchStages(dispatchStages, err.stages))
      setApiError(err.message || "Failed to send agreement.")
      notifyError("Agreement dispatch failed", err.message)
    } finally {
      setSaving(false)
    }

  }



  return (

    <div className="animate-enter px-4 pb-10 max-w-[1400px] mx-auto">
      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="text-center sm:text-left">
            <PageHeader
              variant="wizard"
              eyebrow="New Agreement"
              title="Agreement setup"
              description="Create a MARA-compliant service agreement in six steps."
            />
            {!dispatched && (
              <div className="-mt-2">
                <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} />
              </div>
            )}
          </div>

          <WizardStepper currentStep={currentStep} hidden={dispatched} />

          {!draftReady ? (
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm p-10 text-center text-sm text-slate-500">
              Preparing agreement wizard…
            </Card>
          ) : (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-8 lg:p-10">

          {currentStep === 0 && (

            <ClientStep

              form={formData}

              clients={clients}

              onChange={handleFieldChange}

              onContinue={() => setCurrentStep(1)}

            />

          )}

          {currentStep === 1 && (

            <MatterStep
              form={formData}
              rmaOptions={rmaOptions}
              matterTypes={matterTypes}
              onChange={handleFieldChange}
              onMatterTypesUpdated={handleMatterTypesUpdated}
              onBlurSave={handleBlurSave}
              onBack={() => setCurrentStep(0)}
              onContinue={() => setCurrentStep(2)}
            />

          )}

          {currentStep === 2 && (

            <FeesStep
              form={formData}
              onChange={handleFieldChange}
              onBlurSave={handleBlurSave}
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

              dispatchStages={dispatchStages}
              dispatchSupportRef={dispatchSupportRef}

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
          )}
        </div>

        <WizardSidebar
          form={formData}
          agreementRef={agreementRef}
          rmaOptions={rmaOptions}
          autosaveStatus={autosaveStatus}
          lastSavedAt={lastSavedAt}
          currentStep={currentStep}
          dispatched={dispatched}
        />
      </div>
    </div>

  )

}


