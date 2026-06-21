"use client"

import * as React from "react"
import { CheckCircle2, Download, FileText, PenLine, Shield } from "lucide-react"
import {
  AgreementSignaturePad,
  type AgreementSignaturePadHandle,
} from "./agreement-signature-pad"

type AgreementPortalRow = {
  id: string
  title: string | null
  agreement_number: string | null
  client_name: string | null
  status: string
  signed_at: string | null
  client_name_confirmed: string | null
}

type PortalMeta = {
  agencyName: string
  agentName: string
  agentEmail: string
}

const DECLARATIONS = [
  { key: "readAgreement", label: "I have read the agreement." },
  { key: "understandFees", label: "I understand the fees." },
  { key: "authoriseAgent", label: "I authorise the migration agent." },
  { key: "understandRefund", label: "I understand refund and cancellation conditions." },
] as const

export function ClientAgreementSignPortal({
  token,
  meta,
}: {
  token: string
  meta: PortalMeta
}) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [agreement, setAgreement] = React.useState<AgreementPortalRow | null>(null)
  const [completed, setCompleted] = React.useState(false)

  const [declarations, setDeclarations] = React.useState<Record<string, boolean>>({})
  const [fullName, setFullName] = React.useState("")
  const [hasSignature, setHasSignature] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const sigRef = React.useRef<AgreementSignaturePadHandle | null>(null)

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.preventDefault()
    window.open(`/api/public/agreement-sign/${token}/download`, "_blank", "noopener,noreferrer")
  }

  React.useEffect(() => {
    fetch(`/api/public/agreement-sign/${token}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) {
          setError(json.error || (r.status === 410 ? "Link expired" : "Link not found"))
          return
        }
        setAgreement(json.agreement)
        setCompleted(Boolean(json.completed))
      })
      .catch(() => setError("Unable to load agreement"))
      .finally(() => setLoading(false))
  }, [token])

  const allDecls = DECLARATIONS.every((d) => declarations[d.key])

  const handleSign = async () => {
    if (!allDecls || !fullName.trim()) {
      alert("Please accept all declarations and enter your full legal name.")
      return
    }
    let signaturePngBase64 = ""
    try {
      signaturePngBase64 = sigRef.current?.getDataUrl() || ""
    } catch (e) {
      console.error("SIGNATURE_EXPORT_FAILED", e)
      alert("Could not read your signature. Please clear and draw again.")
      return
    }
    if (!hasSignature || !signaturePngBase64) {
      alert("Please draw your signature.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/agreement-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          clientName: fullName.trim(),
          signaturePngBase64,
          declarations,
        }),
      })
      const json = await res.json()
      if (res.status === 409) {
        setAgreement(json.agreement)
        setCompleted(true)
        return
      }
      if (!res.ok) throw new Error(json.error || "Signing failed")
      setAgreement(json.agreement)
      setCompleted(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Signing failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium">Loading agreement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  const clientName = agreement?.client_name || "Client"
  const agreementRef = agreement?.agreement_number || "—"

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
          <h1 className="text-xl font-bold text-[#111111]">Agreement Signed</h1>
          <p className="text-sm text-slate-600">
            Thank you, {agreement?.client_name_confirmed || fullName || clientName}. Your service agreement{" "}
            <strong>{agreementRef}</strong> has been signed successfully.
          </p>
          <p className="text-xs text-slate-400">A copy will be emailed to you shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Shield className="h-4 w-4" />
            Secure Signing Portal
          </div>
          <h1 className="text-2xl font-black text-[#111111]">Sign Service Agreement</h1>
          <p className="text-sm text-slate-500">
            {meta.agencyName} · Agent: {meta.agentName}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-[#111111] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#111111]">{agreement?.title || "Service Agreement"}</p>
              <p className="text-sm text-slate-500">Reference: {agreementRef}</p>
              <p className="text-sm text-slate-500">Client: {clientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#111111] underline underline-offset-2"
          >
            <Download className="h-4 w-4" />
            Download agreement PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Declarations</h2>
          {DECLARATIONS.map((d) => (
            <label key={d.key} className="flex items-start gap-3 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(declarations[d.key])}
                onChange={(e) => setDeclarations((prev) => ({ ...prev, [d.key]: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Full legal name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As shown on your passport or ID"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
          </label>

          <div>
            <span className="text-sm font-bold text-slate-700 block mb-2">Draw your signature</span>
            <AgreementSignaturePad
              ref={sigRef}
              onSignatureChange={setHasSignature}
            />
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="mt-2 text-xs font-bold text-slate-500 underline"
            >
              Clear signature
            </button>
          </div>

          <button
            type="button"
            disabled={submitting || !allDecls || !fullName.trim() || !hasSignature}
            onClick={handleSign}
            className="w-full h-12 rounded-xl bg-[#111111] text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PenLine className="h-5 w-5" />
            {submitting ? "Submitting…" : "Sign Agreement"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Questions? Contact {meta.agentName} at {meta.agentEmail}
        </p>
      </div>
    </div>
  )
}
