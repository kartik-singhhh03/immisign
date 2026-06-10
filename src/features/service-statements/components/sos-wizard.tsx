"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, Search, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ClientSearchResult } from "@/features/file-notes/components/ClientSearchInput"
import type { MatterSearchResult } from "@/features/file-notes/services/client-search.service"
import type { ClientSosContext, ServiceCatalogItem, ServiceStatement } from "../types"
import { buildSosPreviewHtml } from "../lib/sos-preview-html"
import { FeeComparisonBlock } from "./FeeComparisonBlock"
import { PageHeader } from "@/components/layout/PageHeader"

const STEPS = ["Client", "Services", "Fees", "Preview"] as const
const PAYMENT_METHODS = ["Bank Transfer", "Card", "Cash", "Cheque", "PayID"]
const PAYMENT_TERMS = ["Paid in full", "Paid in instalments", "Deposit + balance"]

type WizardState = {
  client: ClientSearchResult | null
  context: ClientSosContext | null
  servicesCompletedAt: string
  selectedServiceIds: string[]
  servicesNotes: string
  professionalFee: string
  governmentFee: string
  disbursements: string
  quotedProfessionalFee: number
  paymentTerms: string
  paymentDates: string
  paymentMethods: string[]
}

function formatAud(n: number) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SosWizard({
  agencySlug,
  initialClientId,
  initialFileSource,
  initialFileId,
  initialAgreementId,
  initialApprovalId,
  existingStatement,
}: {
  agencySlug: string
  initialClientId?: string
  initialFileSource?: "agreement" | "application_approval"
  initialFileId?: string
  initialAgreementId?: string
  initialApprovalId?: string
  existingStatement?: ServiceStatement & { items?: { metadata?: { catalog_id?: string } }[] }
}) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [statementId, setStatementId] = React.useState<string | null>(existingStatement?.id || null)
  const [catalog, setCatalog] = React.useState<ServiceCatalogItem[]>([])
  const [sent, setSent] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchMatters, setSearchMatters] = React.useState<MatterSearchResult[]>([])
  const [searchOpen, setSearchOpen] = React.useState(false)

  const [state, setState] = React.useState<WizardState>({
    client: null,
    context: null,
    servicesCompletedAt: existingStatement?.services_completed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    selectedServiceIds: [],
    servicesNotes: existingStatement?.services_notes || "",
    professionalFee: String(existingStatement?.professional_fee ?? ""),
    governmentFee: String(existingStatement?.government_fee ?? "0"),
    disbursements: String(existingStatement?.disbursements ?? "0"),
    quotedProfessionalFee: existingStatement?.quoted_professional_fee ?? 0,
    paymentTerms: existingStatement?.payment_terms || "Paid in full",
    paymentDates: existingStatement?.payment_dates || "",
    paymentMethods: existingStatement?.payment_methods || ["Bank Transfer"],
  })

  const totalReceived = React.useMemo(() => {
    const p = parseFloat(state.professionalFee) || 0
    const g = parseFloat(state.governmentFee) || 0
    const d = parseFloat(state.disbursements) || 0
    return Math.round((p + g + d) * 100) / 100
  }, [state.professionalFee, state.governmentFee, state.disbursements])

  const loadCatalog = React.useCallback(async (visaSubclass: string | null) => {
    const q = visaSubclass ? `?visa_subclass=${encodeURIComponent(visaSubclass)}` : ""
    const res = await fetch(`/api/service-catalog${q}`)
    const json = await res.json()
    if (res.ok) {
      setCatalog(json.catalog || [])
      if (!existingStatement && json.defaultSelectedIds?.length) {
        setState((s) => ({ ...s, selectedServiceIds: json.defaultSelectedIds }))
      }
    }
  }, [existingStatement])

  const buildSosContextUrl = React.useCallback(
    (clientId: string) => {
      const params = new URLSearchParams()
      if (initialAgreementId) params.set("agreement_id", initialAgreementId)
      if (initialApprovalId) params.set("approval_id", initialApprovalId)
      if (initialFileSource) params.set("file_source", initialFileSource)
      if (initialFileId) params.set("file_id", initialFileId)
      const qs = params.toString()
      return `/api/clients/${clientId}/sos-context${qs ? `?${qs}` : ""}`
    },
    [initialAgreementId, initialApprovalId, initialFileSource, initialFileId],
  )

  const loadClientContext = React.useCallback(async (clientId: string) => {
    const res = await fetch(buildSosContextUrl(clientId))
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed to load client")
    const ctx = json.context as ClientSosContext
    setState((s) => ({
      ...s,
      context: ctx,
      professionalFee: String(ctx.fees.professional_fee || ""),
      governmentFee: String(ctx.fees.government_fee || "0"),
      disbursements: String(ctx.fees.disbursements || "0"),
      quotedProfessionalFee: ctx.fees.quoted_professional_fee,
    }))
    await loadCatalog(ctx.visa_subclass)
  }, [buildSosContextUrl, loadCatalog])

  React.useEffect(() => {
    if (!initialClientId) return
    ;(async () => {
      try {
        const res = await fetch(buildSosContextUrl(initialClientId))
        const json = await res.json()
        if (!res.ok) return
        const ctx = json.context as ClientSosContext
        setState((s) => ({
          ...s,
          client: {
            id: ctx.client.id,
            name: ctx.client.name,
            email: ctx.client.email,
            phone: ctx.client.phone,
            client_number: ctx.client.client_number,
          },
          context: ctx,
          professionalFee: String(ctx.fees.professional_fee || ""),
          governmentFee: String(ctx.fees.government_fee || "0"),
          disbursements: String(ctx.fees.disbursements || "0"),
          quotedProfessionalFee: ctx.fees.quoted_professional_fee,
        }))
        setSearchQuery(ctx.client.name)
        await loadCatalog(ctx.visa_subclass)
      } catch {
        /* ignore */
      }
    })()
  }, [initialClientId, buildSosContextUrl, loadCatalog])

  React.useEffect(() => {
    if (!existingStatement?.client_id) return
    setState((s) => ({
      ...s,
      client: {
        id: existingStatement.client_id!,
        name: existingStatement.client_name || "",
        email: existingStatement.client_email || "",
        phone: existingStatement.client_phone,
        client_number: existingStatement.client_number,
      },
      selectedServiceIds:
        existingStatement.items
          ?.map((i) => i.metadata?.catalog_id)
          .filter(Boolean) as string[] || s.selectedServiceIds,
    }))
    if (existingStatement.visa_subclass) loadCatalog(existingStatement.visa_subclass)
  }, [existingStatement, loadCatalog])

  React.useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchMatters([])
      return
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const json = await res.json()
      if (res.ok) {
        setSearchMatters(json.matters || [])
        setSearchOpen(true)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const selectClient = async (client: ClientSearchResult) => {
    setState((s) => ({ ...s, client }))
    setSearchQuery(client.name)
    setSearchOpen(false)
    try {
      await loadClientContext(client.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load client")
    }
  }

  const clearClient = () => {
    setState((s) => ({ ...s, client: null, context: null, selectedServiceIds: [] }))
    setSearchQuery("")
  }

  const buildPayload = () => {
    const ctx = state.context
    return {
      client_name: ctx?.client.name || state.client?.name,
      client_number: ctx?.client.client_number || state.client?.client_number,
      client_email: ctx?.client.email || state.client?.email,
      client_phone: ctx?.client.phone || state.client?.phone,
      visa_subclass: ctx?.visa_subclass,
      agreement_id: ctx?.agreement_id,
      approval_id: ctx?.approval_id,
      services_completed_at: state.servicesCompletedAt,
      services_notes: state.servicesNotes,
      selected_service_ids: state.selectedServiceIds,
      professional_fee: parseFloat(state.professionalFee) || 0,
      government_fee: parseFloat(state.governmentFee) || 0,
      disbursements: parseFloat(state.disbursements) || 0,
      quoted_professional_fee: state.quotedProfessionalFee,
      payment_terms: state.paymentTerms,
      payment_dates: state.paymentDates,
      payment_methods: state.paymentMethods,
      issued_stage: "on_completion" as const,
    }
  }

  const ensureStatement = async (): Promise<string> => {
    if (!state.client) throw new Error("Select a client")
    const payload = buildPayload()
    if (statementId) {
      const res = await fetch(`/api/clients/${state.client.id}/service-statements/${statementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")
      return statementId
    }
    const res = await fetch(`/api/clients/${state.client.id}/service-statements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Create failed")
    setStatementId(json.statement.id)
    return json.statement.id as string
  }

  const handleGenerate = async () => {
    setBusy(true)
    setError(null)
    try {
      const id = await ensureStatement()
      const res = await fetch(
        `/api/clients/${state.client!.id}/service-statements/${id}/generate`,
        { method: "POST" },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Generate failed")
      setStep(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    setBusy(true)
    setError(null)
    try {
      const id = await ensureStatement()
      await fetch(`/api/clients/${state.client!.id}/service-statements/${id}/generate`, { method: "POST" })
      const res = await fetch(
        `/api/clients/${state.client!.id}/service-statements/${id}/send`,
        { method: "POST" },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Send failed")
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Send failed")
    } finally {
      setBusy(false)
    }
  }

  const toggleService = (id: string) => {
    setState((s) => ({
      ...s,
      selectedServiceIds: s.selectedServiceIds.includes(id)
        ? s.selectedServiceIds.filter((x) => x !== id)
        : [...s.selectedServiceIds, id],
    }))
  }

  const togglePayMethod = (method: string) => {
    setState((s) => ({
      ...s,
      paymentMethods: s.paymentMethods.includes(method)
        ? s.paymentMethods.filter((m) => m !== method)
        : [...s.paymentMethods, method],
    }))
  }

  const previewHtml = React.useMemo(() => {
    if (!state.client || !state.context) return ""
    const items = state.selectedServiceIds.map((id, index) => {
      const c = catalog.find((x) => x.id === id)
      return {
        id,
        statement_id: statementId || "",
        line_type: "service",
        description: c?.label || "",
        sort_order: index,
      }
    })
    return buildSosPreviewHtml(
      {
        id: statementId || "",
        agency_id: "",
        client_id: state.client.id,
        agreement_id: state.context.agreement_id,
        statement_number: existingStatement?.statement_number || state.context.file_number || "DRAFT",
        status: "generated",
        issued_stage: "on_completion",
        client_name: state.context.client.name,
        client_number: state.context.client.client_number,
        client_email: state.context.client.email,
        client_phone: state.context.client.phone,
        visa_subclass: state.context.visa_subclass,
        services_completed_at: state.servicesCompletedAt,
        services_notes: state.servicesNotes,
        professional_fee: parseFloat(state.professionalFee) || 0,
        government_fee: parseFloat(state.governmentFee) || 0,
        disbursements: parseFloat(state.disbursements) || 0,
        total_received: totalReceived,
        quoted_professional_fee: state.quotedProfessionalFee,
        payment_terms: state.paymentTerms,
        payment_dates: state.paymentDates,
        payment_methods: state.paymentMethods,
        document_path: null,
        review_token: null,
        sent_at: null,
        viewed_at: null,
        generated_at: null,
        acknowledged_at: null,
        issued_at: null,
        created_at: "",
        updated_at: "",
      },
      items,
      {
        agency: { name: "Your Agency" },
        headerContext: {
          matterRef: state.context.file_number || existingStatement?.statement_number || "DRAFT",
          clientName: state.context.client.name,
        },
      },
    )
  }, [state, catalog, statementId, existingStatement, totalReceived])

  if (sent) {
    return (
      <div className="mx-auto max-w-[860px] px-5 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#111111] text-2xl text-white">
          <Check strokeWidth={3} />
        </div>
        <h2 className="font-serif text-3xl font-normal tracking-tight text-[#111111] md:text-4xl">Statement of Service Sent</h2>
        <p className="mt-4 text-sm text-[#5C5C5C]">
          {state.client?.name} will receive an email with a link to acknowledge receipt.
          <br />
          This document is logged to the client file.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/workspace/${agencySlug}/service-statements/new`)}>
            Create Another
          </Button>
          {state.client && (
            <Button
              className="bg-[#111111] hover:bg-[#222222]"
              onClick={() => router.push(`/workspace/${agencySlug}/clients/${state.client!.id}?tab=statement_of_service`)}
            >
              Go to Client File
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[860px] px-5 pb-20 pt-8">
      <Link
        href={`/workspace/${agencySlug}/dashboard`}
        className="mb-6 inline-flex items-center text-sm font-medium text-[#5C5C5C] hover:text-[#111111]"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back
      </Link>

      <PageHeader
        variant="wizard"
        eyebrow="Statement of Service"
        title="New Statement of Service"
        description="Issued at completion of services · Code of Conduct compliant"
      />

      {/* Stepper */}
      <div className="mb-9 flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <React.Fragment key={label}>
              <button
                type="button"
                onClick={() => n < step && setStep(n)}
                className={`flex items-center gap-2 text-[13px] font-medium whitespace-nowrap ${
                  active ? "text-[#1a3a5c]" : done ? "text-[#2a7a6a]" : "text-[#6b7280]"
                }`}
              >
                <span
                  className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-[#1a3a5c] text-white"
                      : done
                        ? "bg-[#2a7a6a] text-white"
                        : "bg-[#e2e0d8] text-[#6b7280]"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 ${step > n ? "bg-[#2a7a6a]" : "bg-[#e2e0d8]"}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Step 1 — Client */}
      {step === 1 && (
        <div className="rounded-[10px] border border-[#e2e0d8] bg-white p-7 md:p-8">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2a7a6a]">
            Search Client
          </p>

          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (state.client && e.target.value !== state.client.name) clearClient()
              }}
              placeholder="Type client name, file number, or phone…"
              className="h-12 rounded-[9px] border-2 border-[#e2e0d8] bg-white pl-10 text-[15px]"
            />
            {searchOpen && searchMatters.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[10px] border border-[#e2e0d8] bg-white shadow-lg">
                {searchMatters.map((m) => (
                  <li key={`${m.clientId}-${m.fileId}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false)
                        router.push(m.deepLink)
                      }}
                      className="flex w-full items-center gap-3 border-b border-[#e2e0d8] px-4 py-3 text-left last:border-0 hover:bg-[#eef5f2]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a3a5c] text-xs font-semibold text-white">
                        {m.clientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{m.clientName}</div>
                        <div className="truncate text-xs text-[#6b7280]">
                          {[m.fileNumber, m.visaSubclass, m.stage].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.client && state.context && (
            <>
              <div className="mb-5 flex items-center gap-3 rounded-[9px] border border-[#c5ddd8] bg-[#eef5f2] px-4 py-3.5">
                <Check className="h-5 w-5 text-[#2a7a6a]" />
                <div className="flex-1 text-sm">
                  <strong className="block text-[#2a7a6a]">{state.context.client.name}</strong>
                  <span className="text-[#6b7280]">
                    {state.context.client.email} · {state.context.client.phone}
                  </span>
                </div>
                <button type="button" onClick={clearClient} className="text-xs text-[#6b7280] hover:text-rose-600">
                  <X className="mr-1 inline h-3 w-3" /> Change client
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Client Name", value: state.context.client.name, auto: true },
                  { label: "Client Number", value: state.context.client.client_number || "—", auto: true },
                  { label: "Visa Subclass", value: state.context.visa_subclass || "—", auto: true },
                  { label: "Date Services Completed", value: state.servicesCompletedAt, auto: false, date: true },
                  { label: "Client Email", value: state.context.client.email, auto: true },
                  { label: "Client Phone", value: state.context.client.phone || "—", auto: true },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
                      {f.label}
                      {f.auto && (
                        <span className="ml-1.5 rounded bg-[#eef5f2] px-1.5 py-0.5 text-[10px] text-[#2a7a6a]">
                          auto
                        </span>
                      )}
                    </label>
                    {f.date ? (
                      <Input
                        type="date"
                        value={state.servicesCompletedAt}
                        onChange={(e) => setState((s) => ({ ...s, servicesCompletedAt: e.target.value }))}
                        className="rounded-[7px] border-[#e2e0d8] bg-[#f5f4f0]"
                      />
                    ) : (
                      <Input readOnly value={f.value} className="rounded-[7px] border-[#c5ddd8] bg-[#eef5f2] font-medium text-[#1a3a5c]" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              disabled={!state.client}
              onClick={() => setStep(2)}
              className="rounded-lg bg-[#1a3a5c] px-6 hover:bg-[#152e4a]"
            >
              Next: Services →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Services */}
      {step === 2 && (
        <div className="rounded-[10px] border border-[#e2e0d8] bg-white p-7 md:p-8">
          <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2a7a6a]">
            Services Rendered
          </p>
          <p className="mb-1 text-[13px] text-[#6b7280]">Pre-ticked based on visa type — adjust as needed</p>
          {state.context?.visa_subclass && (
            <p className="mb-4 text-xs font-medium text-[#2a7a6a]">
              ✓ {state.selectedServiceIds.length} services pre-selected based on {state.context.visa_subclass}
            </p>
          )}
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {catalog.map((item) => {
              const checked = state.selectedServiceIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleService(item.id)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                    checked
                      ? "border-[#2a7a6a] bg-[#eef5f2] font-medium text-[#2a7a6a]"
                      : "border-[#e2e0d8] bg-[#f5f4f0] text-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                      checked ? "border-[#2a7a6a] bg-[#2a7a6a] text-white" : "border-[#e2e0d8]"
                    }`}
                  >
                    {checked && <Check className="h-2.5 w-2.5" />}
                  </span>
                  {item.label}
                </button>
              )
            })}
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Additional Notes (optional)
            </label>
            <Textarea
              value={state.servicesNotes}
              onChange={(e) => setState((s) => ({ ...s, servicesNotes: e.target.value }))}
              placeholder="Any additional services not listed above…"
              className="mt-1.5 min-h-[80px] rounded-[7px] border-[#e2e0d8] bg-[#f5f4f0]"
            />
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={() => setStep(3)} className="bg-[#1a3a5c]">Next: Fees →</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Fees */}
      {step === 3 && (
        <>
          <div className="mb-4 rounded-[10px] border border-[#e2e0d8] bg-white p-7 md:p-8">
            <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2a7a6a]">Fee Summary</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e0d8] text-[11px] uppercase tracking-wide text-[#6b7280]">
                  <th className="pb-2.5 text-left font-semibold">Description</th>
                  <th className="pb-2.5 text-right font-semibold">Amount (AUD incl. GST)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Professional Fee", sub: "Agent services as rendered", key: "professionalFee" as const, prefilled: true },
                  { label: "Government / DIBP Fees", sub: "Paid on behalf of client", key: "governmentFee" as const },
                  { label: "Disbursements", sub: "Translations, couriers, medicals etc.", key: "disbursements" as const },
                ].map((row) => (
                  <tr key={row.key} className="border-b border-[#e2e0d8]">
                    <td className="py-2.5 pr-4 align-top">
                      <div className="font-medium">
                        {row.label}
                        {row.prefilled && (
                          <span className="ml-1.5 rounded bg-[#eef5f2] px-1.5 py-0.5 text-[10px] text-[#2a7a6a]">
                            pre-filled from agreement
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6b7280]">{row.sub}</div>
                    </td>
                    <td className="py-2.5 text-right align-top">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={state[row.key]}
                        onChange={(e) => setState((s) => ({ ...s, [row.key]: e.target.value }))}
                        className="ml-auto max-w-[140px] text-right"
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3.5 font-semibold text-[#111111]">Total Amount Received</td>
                  <td className="pt-3.5 text-right text-[22px] font-semibold text-[#111111]">
                    {formatAud(totalReceived)}
                  </td>
                </tr>
              </tbody>
            </table>
            <FeeComparisonBlock
              quoted={state.quotedProfessionalFee}
              actual={parseFloat(state.professionalFee) || 0}
            />
          </div>

          <div className="rounded-[10px] border border-[#e2e0d8] bg-white p-7 md:p-8">
            <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2a7a6a]">Payment Details</p>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase text-[#6b7280]">Payment Date(s)</label>
                <Input
                  value={state.paymentDates}
                  onChange={(e) => setState((s) => ({ ...s, paymentDates: e.target.value }))}
                  placeholder="e.g. 15 May 2025 / multiple dates"
                  className="mt-1.5 rounded-[7px] border-[#e2e0d8] bg-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold uppercase text-[#6b7280]">Invoice Terms</label>
                <select
                  value={state.paymentTerms}
                  onChange={(e) => setState((s) => ({ ...s, paymentTerms: e.target.value }))}
                  className="mt-1.5 flex h-10 w-full rounded-[7px] border border-[#e2e0d8] bg-[#f5f4f0] px-3 text-sm"
                >
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase text-[#6b7280]">Payment Method(s)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => togglePayMethod(m)}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                      state.paymentMethods.includes(m)
                        ? "border-[#1a3a5c] bg-[#1a3a5c] font-medium text-white"
                        : "border-[#e2e0d8] bg-[#f5f4f0]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button disabled={busy} onClick={handleGenerate} className="bg-[#1a3a5c]">
              {busy ? "Generating…" : "Preview Document →"}
            </Button>
          </div>
        </>
      )}

      {/* Step 4 — Preview */}
      {step === 4 && (
        <>
          <div className="mb-4 rounded-lg border border-[#fde68a] border-l-4 border-l-[#c9a84c] bg-[#fefce8] px-4 py-3.5 text-[13px] leading-relaxed text-[#78350f]">
            <strong className="mb-1 block text-[12px] uppercase tracking-wide text-[#92400e]">
              Code of Conduct — s.314 Compliance
            </strong>
            Standard wording covers services rendered, fees charged, 7-year file retention, and OMARA complaint rights.
          </div>

          <div
            className="overflow-hidden rounded-[10px] border border-[#e2e0d8] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            dangerouslySetInnerHTML={{ __html: previewHtml.replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, "").replace(/<style[\s\S]*?<\/style>/i, "") }}
          />

          <div className="mt-5 flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={handleGenerate}>
                Regenerate PDF
              </Button>
              <Button disabled={busy} onClick={handleSend} className="bg-[#2a7a6a] hover:bg-[#236b5c]">
                <Send className="mr-2 h-4 w-4" />
                {busy ? "Sending…" : "Send to Client"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
