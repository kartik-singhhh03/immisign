"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  showBack: boolean
  continueLabel?: string
  continueDisabled?: boolean
  onBack: () => void
  onContinue: () => void
}

export function WizardNav({
  showBack,
  continueLabel = "Continue",
  continueDisabled,
  onBack,
  onContinue,
}: Props) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      {showBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-xl border-slate-200 bg-white font-bold px-6 h-11"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
      ) : (
        <div />
      )}
      <Button
        type="button"
        disabled={continueDisabled}
        onClick={onContinue}
        className="rounded-xl bg-[#0D9F8C] font-bold px-6 h-11 shadow-md hover:bg-[#0A5B52] disabled:opacity-40"
      >
        {continueLabel}
        <ArrowRight className="h-4 w-4 ml-1.5" />
      </Button>
    </div>
  )
}
