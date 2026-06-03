"use client"

import * as React from "react"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { validatePassword, passwordPolicyMessage } from "@/lib/auth/password-policy"
import { useUserProfile } from "@/lib/hooks/useSupabaseData"

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "mfa", label: "MFA" },
  { id: "sessions", label: "Sessions" },
  { id: "logs", label: "Security Logs" },
  { id: "account", label: "Account" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function SecurityCenterPanel({
  activeTab,
  onTabChange,
  onToast,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onToast: (msg: string) => void
}) {
  const { user } = useAuthStore()
  const { updateProfile, loading: profileLoading } = useUserProfile()

  const [myFullName, setMyFullName] = React.useState(user?.user_metadata?.full_name || "")
  const [myPhone, setMyPhone] = React.useState(user?.phone || "")

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [passwordSaving, setPasswordSaving] = React.useState(false)

  const [mfaStatus, setMfaStatus] = React.useState<{
    enrolled: boolean
    mandatory: boolean
    factors: { id: string; status: string }[]
  } | null>(null)
  const [enrollData, setEnrollData] = React.useState<{
    factorId: string
    qrCode?: string
    secret?: string
  } | null>(null)
  const [totpCode, setTotpCode] = React.useState("")
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null)

  const [sessions, setSessions] = React.useState<
    { id: string; isCurrent: boolean; device: string; browser: string; ip: string | null; lastActivity: string }[]
  >([])
  const [logs, setLogs] = React.useState<
    { id: string; event_type: string; ip_address: string | null; created_at: string; device_label: string | null }[]
  >([])

  const [deletePassword, setDeletePassword] = React.useState("")
  const [deleteConfirm, setDeleteConfirm] = React.useState("")
  const [deleteMfaCode, setDeleteMfaCode] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)

  const loadMfaStatus = React.useCallback(async () => {
    const res = await fetch("/api/security/mfa/status")
    const json = await res.json()
    if (res.ok) setMfaStatus(json)
  }, [])

  const loadSessions = React.useCallback(async () => {
    const res = await fetch("/api/security/sessions")
    const json = await res.json()
    if (res.ok) setSessions(json.sessions || [])
  }, [])

  const loadLogs = React.useCallback(async () => {
    const res = await fetch("/api/security/audit-logs?limit=40")
    const json = await res.json()
    if (res.ok) setLogs(json.logs || [])
  }, [])

  React.useEffect(() => {
    if (activeTab === "mfa") void loadMfaStatus()
    if (activeTab === "sessions") void loadSessions()
    if (activeTab === "logs") void loadLogs()
  }, [activeTab, loadMfaStatus, loadSessions, loadLogs])

  const handleSaveProfile = async () => {
    await updateProfile({ full_name: myFullName, phone: myPhone })
    onToast("Profile updated.")
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const policy = validatePassword(newPassword)
    if (!policy.valid) {
      onToast(policy.errors[0])
      return
    }
    setPasswordSaving(true)
    try {
      const res = await fetch("/api/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update password")
      setCurrentPassword("")
      setNewPassword("")
      onToast("Password updated.")
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Password update failed")
    } finally {
      setPasswordSaving(false)
    }
  }

  const startMfaEnroll = async () => {
    const res = await fetch("/api/security/mfa/enroll", { method: "POST" })
    const json = await res.json()
    if (!res.ok) {
      onToast(json.error || "MFA enrollment failed")
      return
    }
    setEnrollData({ factorId: json.factorId, qrCode: json.qrCode, secret: json.secret })
  }

  const verifyMfa = async () => {
    if (!enrollData?.factorId || !totpCode) return
    const res = await fetch("/api/security/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId: enrollData.factorId, code: totpCode }),
    })
    const json = await res.json()
    if (!res.ok) {
      onToast(json.error || "Invalid code")
      return
    }
    setRecoveryCodes(json.recoveryCodes || [])
    setEnrollData(null)
    setTotpCode("")
    await loadMfaStatus()
    onToast("MFA enabled. Save your recovery codes.")
  }

  const disableMfa = async (factorId: string) => {
    const res = await fetch("/api/security/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId }),
    })
    const json = await res.json()
    if (!res.ok) {
      onToast(json.error || "Cannot disable MFA")
      return
    }
    await loadMfaStatus()
    onToast("MFA disabled.")
  }

  const revokeSessions = async (scope: "current" | "all") => {
    const res = await fetch("/api/security/sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    })
    const json = await res.json()
    if (!res.ok) {
      onToast(json.error || "Revoke failed")
      return
    }
    onToast(scope === "all" ? "Signed out of all sessions." : "Current session ended.")
    if (scope === "all" || scope === "current") {
      window.location.href = "/login"
    }
  }

  const requestAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleting(true)
    try {
      const factorId = mfaStatus?.factors?.find((f) => f.status === "verified")?.id
      const res = await fetch("/api/security/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirm,
          mfaCode: deleteMfaCode || undefined,
          factorId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Deletion request failed")
      window.location.href = "/login?deleted=1"
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Deletion failed")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              activeTab === tab.id
                ? "bg-[#0D9F8C] text-white"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Full name</Label>
            <Input
              value={myFullName}
              onChange={(e) => setMyFullName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Phone</Label>
            <Input
              value={myPhone}
              onChange={(e) => setMyPhone(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={profileLoading}
            className="rounded-xl bg-[#0D9F8C] font-bold"
          >
            Save profile
          </Button>
        </div>
      )}

      {activeTab === "password" && (
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <p className="text-xs text-slate-500 font-medium">{passwordPolicyMessage()}</p>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={passwordSaving}
            className="rounded-xl bg-[#0D9F8C] font-bold"
          >
            Update password
          </Button>
        </form>
      )}

      {activeTab === "mfa" && (
        <div className="space-y-4 max-w-lg">
          {mfaStatus?.mandatory && !mfaStatus.enrolled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              MFA is mandatory for your role. Enroll an authenticator app before continuing sensitive work.
            </div>
          )}
          {mfaStatus?.enrolled ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-700">MFA is active (TOTP).</p>
              {mfaStatus.factors
                .filter((f) => f.status === "verified")
                .map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border p-3">
                    <span className="text-xs font-bold text-slate-600">Authenticator app</span>
                    {!mfaStatus.mandatory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => disableMfa(f.id)}
                      >
                        Disable
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Use Google Authenticator, Microsoft Authenticator, 1Password, or any TOTP app.
              </p>
              {!enrollData ? (
                <Button type="button" onClick={startMfaEnroll} className="rounded-xl bg-[#0D9F8C] font-bold">
                  Set up authenticator
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border p-4">
                  {enrollData.qrCode && (
                    <img
                      src={enrollData.qrCode}
                      alt="MFA QR code"
                      className="h-40 w-40 rounded-lg border"
                    />
                  )}
                  {enrollData.secret && (
                    <p className="text-xs font-mono text-slate-600 break-all">Secret: {enrollData.secret}</p>
                  )}
                  <Input
                    placeholder="6-digit code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="h-11 rounded-xl max-w-[200px]"
                  />
                  <Button type="button" onClick={verifyMfa} className="rounded-xl bg-[#0D9F8C] font-bold">
                    Verify and enable
                  </Button>
                </div>
              )}
            </div>
          )}
          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs font-bold text-amber-900 mb-2">Recovery codes (store securely)</p>
              <ul className="grid grid-cols-2 gap-1 text-xs font-mono">
                {recoveryCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => revokeSessions("current")}
            >
              Log out this device
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold text-red-600"
              onClick={() => revokeSessions("all")}
            >
              Log out all sessions
            </Button>
          </div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex justify-between rounded-xl border border-slate-200 p-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-700">
                    {s.browser} · {s.device}
                    {s.isCurrent && (
                      <span className="ml-2 text-emerald-600 font-bold">Current</span>
                    )}
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    IP {s.ip || "—"} · {new Date(s.lastActivity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-slate-400">No session data yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="p-3">Event</th>
                <th className="p-3">IP</th>
                <th className="p-3">Device</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3 font-semibold text-slate-700">{log.event_type}</td>
                  <td className="p-3 text-slate-500">{log.ip_address || "—"}</td>
                  <td className="p-3 text-slate-500">{log.device_label || "—"}</td>
                  <td className="p-3 text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    No security events logged yet. Apply migration and sign in again.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "account" && (
        <form onSubmit={requestAccountDeletion} className="space-y-4 max-w-md border border-red-100 rounded-xl p-4 bg-red-50/30">
          <p className="text-xs font-semibold text-red-800">
            Account deletion is soft-delete with audit logging. Owners must clear subscription, team, agreements, and approvals first.
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Password</Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          {mfaStatus?.enrolled && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">MFA code</Label>
              <Input
                value={deleteMfaCode}
                onChange={(e) => setDeleteMfaCode(e.target.value)}
                placeholder="6-digit code"
                className="h-11 rounded-xl max-w-[200px]"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Type DELETE MY ACCOUNT</Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={deleting}
            variant="destructive"
            className="rounded-xl font-bold"
          >
            Request account deletion
          </Button>
        </form>
      )}
    </div>
  )
}
