"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

type Prefs = Record<string, boolean | string>

const DIGEST_OPTIONS = [
  { value: "immediate", label: "Immediate — email per event" },
  { value: "hourly", label: "Hourly digest" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
] as const

const ROWS: { key: string; label: string }[] = [
  { key: "email_enabled", label: "Email notifications (master)" },
  { key: "in_app_enabled", label: "In-app notifications (master)" },
  { key: "email_agreements", label: "Agreement emails" },
  { key: "in_app_agreements", label: "Agreement in-app" },
  { key: "email_approvals", label: "Approval emails" },
  { key: "in_app_approvals", label: "Approval in-app" },
  { key: "email_sos", label: "SOS emails" },
  { key: "in_app_sos", label: "SOS in-app" },
  { key: "email_file_notes", label: "File note emails" },
  { key: "in_app_file_notes", label: "File note in-app" },
  { key: "email_compliance", label: "Compliance emails" },
  { key: "in_app_compliance", label: "Compliance in-app" },
  { key: "email_documents", label: "Document emails" },
  { key: "in_app_documents", label: "Document in-app" },
  { key: "email_team", label: "Team emails" },
  { key: "in_app_team", label: "Team in-app" },
  { key: "email_system", label: "System emails" },
  { key: "in_app_system", label: "System in-app" },
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
    return <p className="text-sm text-[#5C5C5C]">Loading preferences…</p>
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3 text-[#111111]">
        <Bell className="h-5 w-5" />
        <p className="text-sm font-medium text-[#5C5C5C]">
          Control in-app alerts, email delivery, and digest frequency for each workflow category.
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">
          Email digest frequency
        </label>
        <select
          value={(prefs.email_digest_frequency as string) || "immediate"}
          onChange={(e) => {
            setPrefs({ ...prefs, email_digest_frequency: e.target.value })
            setSaved(false)
          }}
          className="mt-2 w-full rounded-xl border border-[#E7E7E7] bg-white px-4 py-3 text-sm text-[#111111]"
        >
          {DIGEST_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {ROWS.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E7E7E7] bg-white px-4 py-3 hover:bg-[#FAFAFA]"
          >
            <span className="text-sm font-semibold text-[#111111]">{row.label}</span>
            <input
              type="checkbox"
              checked={Boolean(prefs[row.key])}
              onChange={() => toggle(row.key)}
              className="h-4 w-4 rounded border-[#E7E7E7] text-[#111111]"
            />
          </label>
        ))}
      </div>
      <Button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[#111111] font-bold hover:bg-[#1C1C1C]"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save preferences"}
      </Button>
    </div>
  )
}
