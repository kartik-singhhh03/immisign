"use client"

import * as React from "react"
import { useAuthStore } from "@/store/authStore"
import { isBillingRestrictedForUiRole } from "@/lib/auth/db-roles"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"

type BillingSummary = {
  plan: {
    id: string
    name: string
    baseMonthlyUsd: number
    seatMonthlyUsd: number
  }
  subscription: {
    status: string
    planName: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    hasStripeSubscription: boolean
  }
  seats: {
    included: number
    used: number
    pendingInvites: number
    additional: number
    monthlyTotalUsd: number
  }
  nextInvoice: {
    amountCents: number | null
    amountUsd: string | null
  }
  invoices: Array<{
    id: string
    amountPaid: number
    currency: string
    status: string
    hostedInvoiceUrl: string | null
    invoicePdf: string | null
    paidAt: string | null
    createdAt: string
  }>
}

function formatMoney(cents: number, currency = "aud") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function BillingPage() {
  const { user } = useAuthStore()
  const { slug: workspaceSlug } = useRequireWorkspace()

  const [data, setData] = React.useState<BillingSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const currentRole = user?.role || "Owner"
  const isBillingRestricted = isBillingRestrictedForUiRole(currentRole)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadBilling = React.useCallback(async (sessionId?: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""
      const res = await fetch(`/api/stripe/billing${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || "Failed to load billing")
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadBilling()
  }, [loadBilling])

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "true") {
      const sessionId = params.get("session_id")
      triggerToast("Subscription updated successfully.")
      window.history.replaceState({}, "", window.location.pathname)
      void loadBilling(sessionId)
    }
  }, [loadBilling])

  const startCheckout = async () => {
    setActionLoading("checkout")
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Checkout failed")
      if (json.url) window.location.href = json.url
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : "Checkout failed")
    } finally {
      setActionLoading(null)
    }
  }

  const openPortal = async () => {
    setActionLoading("portal")
    try {
      const returnUrl = `${window.location.origin}/workspace/${workspaceSlug}/billing`
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Portal failed")
      if (json.url) window.location.href = json.url
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : "Could not open billing portal")
    } finally {
      setActionLoading(null)
    }
  }

  const syncSeats = async () => {
    setActionLoading("sync")
    try {
      const res = await fetch("/api/stripe/seats", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Seat sync failed")
      triggerToast("Seat count synced with Stripe.")
      await loadBilling()
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : "Seat sync failed")
    } finally {
      setActionLoading(null)
    }
  }

  if (!workspaceSlug) {
    return (
      <div className="p-12 text-center font-medium text-slate-500">
        Loading billing workspace...
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading billing...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center">
        <p className="font-medium text-red-600">{error || "Billing unavailable"}</p>
        <Button className="mt-4" onClick={() => void loadBilling()}>
          Retry
        </Button>
      </div>
    )
  }

  const { plan, subscription, seats, nextInvoice, invoices } = data
  const isActive = ["active", "trialing"].includes(subscription.status)
  const seatUsagePercent = Math.min(
    100,
    Math.round((seats.used / Math.max(seats.included, 1)) * 100),
  )

  return (
    <div className="relative">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex animate-in items-center gap-2 rounded-xl border border-slate-700/50 bg-[#111111] px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#111111]" />
          {toastMessage}
        </div>
      )}

      <PageHeader
        eyebrow="Billing"
        title="Plan, seats and invoices"
        description="ImmiMate Plan — $49/month base with 3 included seats. Additional active agents, RMAs, admins, and staff are $10/month each."
      />

      {isBillingRestricted && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-medium text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">Restricted billing access.</span> Only{" "}
            <span className="font-bold">Owner</span> or <span className="font-bold">Admin</span>{" "}
            can manage subscriptions and payment methods.
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-2xl border border-[#E7E7E7] bg-gradient-to-br from-[#FAFAFA]/5 via-white to-[#FAFAFA]/10">
          <CardContent className="flex min-h-[280px] flex-col justify-between p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded border border-[#E7E7E7] bg-[#FAFAFA] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#111111]">
                  {subscription.status}
                </span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#111111]">
                  {plan.name}
                </h2>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
                  ${plan.baseMonthlyUsd}/month includes one agency workspace, one business
                  profile, {seats.included} seats, unlimited agreements, approvals, signing,
                  templates, branding, and audit trail.
                </p>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  + ${plan.seatMonthlyUsd}/month per additional active seat beyond{" "}
                  {seats.included}.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400">
                    Monthly total
                  </span>
                  <div className="mt-1 text-2xl font-black text-[#111111]">
                    ${seats.monthlyTotalUsd}/mo
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400">
                    Next invoice
                  </span>
                  <div className="mt-1 text-lg font-bold text-[#111111]">
                    {nextInvoice.amountUsd != null
                      ? `$${nextInvoice.amountUsd}`
                      : subscription.currentPeriodEnd
                        ? `Due ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        : "—"}
                  </div>
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                  Subscription cancels at end of current billing period (
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : "see Stripe portal"}
                  ).
                </p>
              )}

              {!isBillingRestricted && (
                <div className="flex flex-wrap gap-2">
                  {!isActive || !subscription.hasStripeSubscription ? (
                    <Button
                      disabled={actionLoading === "checkout"}
                      onClick={() => void startCheckout()}
                      className="h-10.5 rounded-xl bg-[#111111] px-5 text-xs font-bold text-white hover:bg-[#222222]"
                    >
                      {actionLoading === "checkout" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Subscribe — $49/month"
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        disabled={!!actionLoading}
                        onClick={() => void openPortal()}
                        variant="outline"
                        className="h-10.5 rounded-xl border-slate-200 bg-white text-xs font-bold"
                      >
                        {actionLoading === "portal" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Manage in Stripe Portal"
                        )}
                      </Button>
                      <Button
                        disabled={!!actionLoading}
                        onClick={() => void syncSeats()}
                        variant="outline"
                        className="h-10.5 rounded-xl border-slate-200 bg-white text-xs font-bold"
                      >
                        Sync seat count
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/50 bg-white/60">
          <CardContent className="space-y-6 p-7">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-[#111111]">
              Seat usage
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" /> Active billable seats
                </span>
                <span className="font-mono text-[#111111]">
                  {seats.used} used · {seats.included} included
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#111111] transition-all"
                  style={{ width: `${seatUsagePercent}%` }}
                />
              </div>
            </div>

            <dl className="grid gap-3 text-xs">
              {[
                ["Included seats", seats.included],
                ["Used seats", seats.used],
                ["Pending invites", seats.pendingInvites],
                ["Additional seats", seats.additional],
                ["Monthly total", `$${seats.monthlyTotalUsd}`],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex justify-between border-b border-slate-50 pb-2 font-semibold"
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-mono text-[#111111]">{value}</dd>
                </div>
              ))}
            </dl>

            {seats.additional > 0 && (
              <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-3 text-[11px] font-medium text-amber-800">
                You have {seats.additional} additional seat
                {seats.additional === 1 ? "" : "s"} billed at ${plan.seatMonthlyUsd}/month each.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/50 bg-white/60 divide-y divide-slate-100">
        <div className="bg-slate-50/50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Invoice history
          </h3>
        </div>
        {invoices.length === 0 ? (
          <p className="p-6 text-center text-xs font-medium text-slate-400">
            No invoices yet. They appear here after your first Stripe payment.
          </p>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4.5 text-xs font-semibold"
            >
              <div>
                <span className="text-sm font-bold text-[#111111]">{invoice.id}</span>
                <span className="ml-2 font-medium text-slate-400">
                  {invoice.paidAt
                    ? new Date(invoice.paidAt).toLocaleDateString()
                    : new Date(invoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-700">
                  {formatMoney(invoice.amountPaid, invoice.currency)}
                </span>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 text-[9px] font-bold capitalize",
                    invoice.status === "paid"
                      ? "border-[#E7E7E7] bg-[#FAFAFA] text-[#111111]"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  {invoice.status}
                </span>
                {(invoice.invoicePdf || invoice.hostedInvoiceUrl) && (
                  <a
                    href={invoice.invoicePdf || invoice.hostedInvoiceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold hover:bg-slate-50"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
