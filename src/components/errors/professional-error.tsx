"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ProfessionalErrorKind =
  | "client_not_found"
  | "agreement_not_found"
  | "permission_denied"
  | "data_load_failed"
  | "network_failure"
  | "signwell_failure"
  | "email_delivery_failure"
  | "generic"

const COPY: Record<
  ProfessionalErrorKind,
  { title: string; description: string; recovery: string }
> = {
  client_not_found: {
    title: "Client not found",
    description: "This client record does not exist or you do not have access to it.",
    recovery: "Return to the client list and open a valid profile.",
  },
  agreement_not_found: {
    title: "Agreement not found",
    description: "The agreement workspace could not be loaded. The link may be outdated.",
    recovery: "Open the agreement from the Agreements list.",
  },
  permission_denied: {
    title: "Permission denied",
    description: "Your role does not allow this action in the current workspace.",
    recovery: "Contact your agency owner if you need elevated access.",
  },
  data_load_failed: {
    title: "Data could not be loaded",
    description: "We could not retrieve the latest data from the server.",
    recovery: "Check your connection and try again.",
  },
  network_failure: {
    title: "Network failure",
    description: "The request did not complete. This is usually temporary.",
    recovery: "Retry when your connection is stable.",
  },
  signwell_failure: {
    title: "SignWell dispatch failed",
    description: "The document was not sent for electronic signature.",
    recovery: "Review signer emails and try dispatch again.",
  },
  email_delivery_failure: {
    title: "Email delivery failed",
    description: "The system could not confirm that notification email was sent.",
    recovery: "Verify email settings and SignWell dashboard.",
  },
  generic: {
    title: "Something went wrong",
    description: "An unexpected error occurred.",
    recovery: "Try again or contact support with the reference below.",
  },
}

export function ProfessionalErrorPanel({
  kind = "generic",
  detail,
  supportRef,
  onRetry,
  backHref,
  backLabel = "Go back",
  className,
}: {
  kind?: ProfessionalErrorKind
  detail?: string
  supportRef?: string
  onRetry?: () => void
  backHref?: string
  backLabel?: string
  className?: string
}) {
  const copy = COPY[kind]
  return (
    <div
      className={cn(
        "mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm",
        className,
      )}
      role="alert"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-[#111111]">{copy.title}</h2>
      <p className="mt-2 text-sm text-slate-600 font-medium">{copy.description}</p>
      {detail && (
        <p className="mt-3 text-sm text-red-700 font-semibold rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          {detail}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">{copy.recovery}</p>
      {supportRef && (
        <p className="mt-3 text-[10px] font-mono text-slate-400">Reference: {supportRef}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} className="rounded-xl bg-[#111111] font-bold">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
          </Button>
        )}
        {backHref && (
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> {backLabel}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
