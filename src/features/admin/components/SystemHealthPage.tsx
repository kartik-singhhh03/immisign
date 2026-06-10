"use client"

import * as React from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RefreshCw, Activity, Radio, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { IntegrationHealthResult, ProductionReadinessResult } from "@/lib/integrations/health/types"

type HealthPayload = {
  checks: IntegrationHealthResult[]
  readiness: ProductionReadinessResult
  appUrlMismatch: { configured: string; detected: string; portMismatch: boolean } | null
  timestamp: string
}

const STATUS_STYLES = {
  healthy: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  error: "bg-rose-50 text-rose-800 border-rose-200",
}

function StatusBadge({ status }: { status: IntegrationHealthResult["status"] }) {
  return (
    <span className={cn("rounded-lg border px-2.5 py-0.5 text-xs font-bold uppercase", STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function IntegrationCard({ check }: { check: IntegrationHealthResult }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black capitalize text-[#111111]">{check.integration}</CardTitle>
        <StatusBadge status={check.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-slate-600 font-medium">{check.message}</p>
        <div className="text-xs text-slate-400 space-y-1">
          {check.lastSuccessAt && (
            <div>Last success: {new Date(check.lastSuccessAt).toLocaleString("en-AU")}</div>
          )}
          {check.lastFailureAt && (
            <div>Last failure: {new Date(check.lastFailureAt).toLocaleString("en-AU")}</div>
          )}
        </div>
        {check.details && Object.keys(check.details).length > 0 && (
          <pre className="mt-2 rounded-lg bg-slate-50 p-3 text-[10px] font-mono text-slate-600 overflow-x-auto max-h-32">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

type ResendHealth = {
  healthy: boolean
  domain: string | null
  domainStatus: string | null
  fromEmail: string
  apiConnected: boolean
  delivery?: {
    lastEmailSent?: { created_at: string; subject: string; recipient: string } | null
    lastEmailDelivered?: { delivered_at: string; subject: string } | null
    failedEmails24h?: number
  }
}

export function SystemHealthPage() {
  const [data, setData] = React.useState<HealthPayload | null>(null)
  const [resendHealth, setResendHealth] = React.useState<ResendHealth | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [testEmail, setTestEmail] = React.useState("")
  const [testResult, setTestResult] = React.useState<string | null>(null)
  const [testSending, setTestSending] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthRes, resendRes] = await Promise.all([
        fetch("/api/debug/system-health"),
        fetch("/api/debug/resend"),
      ])
      const json = await healthRes.json()
      if (!healthRes.ok) throw new Error(json.error || `HTTP ${healthRes.status}`)
      setData(json)
      if (resendRes.ok) {
        setResendHealth(await resendRes.json())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health data")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const webhookCheck = data?.checks.find((c) => c.integration === "webhooks")
  const notifCheck = data?.checks.find((c) => c.integration === "notifications")

  const sendTestEmail = async () => {
    if (!testEmail.trim()) return
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/debug/resend/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setTestResult(`Sent — Resend ID: ${json.resendId}. Check inbox and Resend dashboard.`)
      await load()
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Send failed")
    } finally {
      setTestSending(false)
    }
  }

  return (
    <div className="animate-enter space-y-6 max-w-6xl mx-auto pb-10">
      <PageHeader
        eyebrow="Admin"
        title="System Health"
        description="Live integration diagnostics — Owner and Admin only. No secrets are displayed."
        action={
          <Button
            variant="outline"
            className="rounded-xl font-bold"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {data?.appUrlMismatch && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>APP URL mismatch:</strong> configured <code>{data.appUrlMismatch.configured}</code> but server
          detected <code>{data.appUrlMismatch.detected}</code>. Update <code>NEXT_PUBLIC_APP_URL</code> in{" "}
          <code>.env.local</code>.
        </div>
      )}

      {data && (
        <Card className="rounded-2xl border-[#111111]/10 bg-[#FAFAFA]">
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Production Readiness</div>
              <div className="text-4xl font-black text-[#111111] mt-1">{data.readiness.percentage}%</div>
              <div className="text-sm text-slate-500 mt-1">
                {data.readiness.score} / {data.readiness.maxScore} weighted checks passed
              </div>
            </div>
            <Activity className="h-12 w-12 text-[#111111]/20" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl h-40 animate-pulse bg-slate-50" />
            ))
          : data?.checks.map((check) => <IntegrationCard key={check.integration} check={check} />)}
      </div>

      {resendHealth && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Health (Resend)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3 text-slate-600">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                Domain verified:{" "}
                <span className={resendHealth.healthy ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                  {resendHealth.domainStatus === "verified" ? "Yes" : resendHealth.domainStatus || "Check domain"}
                </span>
                {resendHealth.domain && ` (${resendHealth.domain})`}
              </p>
              <p>
                API connected:{" "}
                <span className={resendHealth.apiConnected ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                  {resendHealth.apiConnected ? "Yes" : "No"}
                </span>
              </p>
              <p>From: <code className="text-xs">{resendHealth.fromEmail}</code></p>
              <p>
                Failed (24h):{" "}
                <span className="font-bold">{resendHealth.delivery?.failedEmails24h ?? 0}</span>
              </p>
            </div>
            {resendHealth.delivery?.lastEmailSent && (
              <p className="text-xs text-slate-500">
                Last sent: {new Date(resendHealth.delivery.lastEmailSent.created_at).toLocaleString("en-AU")} →{" "}
                {resendHealth.delivery.lastEmailSent.recipient}
              </p>
            )}
            {resendHealth.delivery?.lastEmailDelivered && (
              <p className="text-xs text-slate-500">
                Last delivered: {new Date(resendHealth.delivery.lastEmailDelivered.delivered_at!).toLocaleString("en-AU")}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <Input
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-xs rounded-xl"
              />
              <Button
                type="button"
                className="rounded-xl bg-[#111111] font-bold"
                disabled={testSending || !testEmail.trim()}
                onClick={sendTestEmail}
              >
                {testSending ? "Sending…" : "Send test email"}
              </Button>
            </div>
            {testResult && <p className="text-xs font-semibold text-slate-700">{testResult}</p>}
          </CardContent>
        </Card>
      )}

      {notifCheck && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Notification Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-600">
            <p>
              NTF-1 schema:{" "}
              {notifCheck.status === "healthy" ? (
                <span className="font-bold text-emerald-700">Applied</span>
              ) : (
                <span className="font-bold text-rose-700">Migration required</span>
              )}
            </p>
            <p>
              Realtime: connect via notification bell — verify instant delivery after lifecycle events.
            </p>
            <p>
              Pending digests: requires <code>CRON_SECRET</code> and NTF-1 <code>email_digest_frequency</code> prefs.
            </p>
          </CardContent>
        </Card>
      )}

      {webhookCheck && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-black">Recent Webhook Events</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(webhookCheck.details?.recentEvents) &&
            (webhookCheck.details.recentEvents as unknown[]).length > 0 ? (
              <ul className="space-y-2 text-sm">
                {(webhookCheck.details.recentEvents as Array<{
                  provider: string
                  event_type: string
                  status: string
                  received_at: string
                }>).map((ev, i) => (
                  <li key={i} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="font-semibold text-[#111111]">
                      {ev.provider} · {ev.event_type}
                    </span>
                    <span className="text-slate-400 text-xs">{ev.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No webhook events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {data && (
        <p className="text-xs text-slate-400 text-center">
          Last checked {new Date(data.timestamp).toLocaleString("en-AU")}
        </p>
      )}
    </div>
  )
}
