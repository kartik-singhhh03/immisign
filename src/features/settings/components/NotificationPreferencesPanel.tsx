"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

type Prefs = Record<string, boolean>

const ROWS: { key: string; label: string; group: "channel" | "category" }[] = [
  { key: "email_enabled", label: "Email notifications (master)", group: "channel" },
  { key: "in_app_enabled", label: "In-app notifications (master)", group: "channel" },
  { key: "email_agreements", label: "Agreement emails", group: "category" },
  { key: "in_app_agreements", label: "Agreement in-app", group: "category" },
  { key: "email_approvals", label: "Approval emails", group: "category" },
  { key: "in_app_approvals", label: "Approval in-app", group: "category" },
  { key: "email_documents", label: "Document emails", group: "category" },
  { key: "in_app_documents", label: "Document in-app", group: "category" },
  { key: "email_team", label: "Team emails", group: "category" },
  { key: "in_app_team", label: "Team in-app", group: "category" },
  { key: "email_system", label: "System emails", group: "category" },
  { key: "in_app_system", label: "System in-app", group: "category" },
]

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings/notification-preferences")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setPrefs(j.preferences)
      })
  }, [])

  const toggle = (key: string) => {
    if (!prefs) return
    setPrefs({ ...prefs, [key]: !prefs[key] })
    setSaved(false)
  }

  const save = async () => {
    if (!prefs) return
    setSaving(true)
    await fetch("/api/settings/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    setSaved(true)
  }

  if (!prefs) {
    return <p className="text-sm text-slate-500">Loading preferences…</p>
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3 text-[#0D9F8C]">
        <Bell className="h-5 w-5" />
        <p className="text-sm font-medium text-slate-600">
          Control how ImmiSign notifies you about agreements, approvals, documents, and team activity.
        </p>
      </div>
      <div className="space-y-3">
        {ROWS.map((row) => (
          <label
            key={row.key}
            className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50"
          >
            <span className="text-sm font-semibold text-slate-800">{row.label}</span>
            <input
              type="checkbox"
              checked={Boolean(prefs[row.key])}
              onChange={() => toggle(row.key)}
              className="h-4 w-4 rounded border-slate-300 text-[#0D9F8C]"
            />
          </label>
        ))}
      </div>
      <Button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[#0D9F8C] font-bold"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save preferences"}
      </Button>
    </div>
  )
}
