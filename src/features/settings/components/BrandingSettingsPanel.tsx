"use client"

import * as React from "react"
import { Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  branding: any
  disabled?: boolean
  brandColor: string
  onBrandColorChange: (v: string) => void
  onSave: (updates: Record<string, unknown>) => Promise<void>
  onToast: (msg: string) => void
  onLogoUploaded?: (logoUrl: string) => void
}

export function BrandingSettingsPanel({
  branding,
  disabled,
  brandColor,
  onBrandColorChange,
  onSave,
  onToast,
  onLogoUploaded,
}: Props) {
  const [logoUrl, setLogoUrl] = React.useState(branding?.logo_url || "")
  const [uploading, setUploading] = React.useState(false)
  const [headerTitle, setHeaderTitle] = React.useState(branding?.agreement_header_title || "Migration Agent Service Agreement")
  const [footerText, setFooterText] = React.useState(
    branding?.agreement_footer_text ||
      "This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct."
  )
  const [refPrefix, setRefPrefix] = React.useState(branding?.agreement_ref_prefix || "AGR")
  const [refStart, setRefStart] = React.useState(String(branding?.agreement_ref_start ?? 1000))

  React.useEffect(() => {
    setLogoUrl(branding?.logo_url || "")
    setHeaderTitle(branding?.agreement_header_title || "Migration Agent Service Agreement")
    setFooterText(
      branding?.agreement_footer_text ||
        "This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct."
    )
    setRefPrefix(branding?.agreement_ref_prefix || "AGR")
    setRefStart(String(branding?.agreement_ref_start ?? 1000))
  }, [branding])

  const uploadLogo = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/settings/branding/logo", { method: "POST", body: form, credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setLogoUrl(data.logoUrl)
      onLogoUploaded?.(data.logoUrl)
      onToast("Logo uploaded successfully")
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : "Logo upload failed")
    } finally {
      setUploading(false)
    }
  }

  const deleteLogo = async () => {
    setUploading(true)
    try {
      const res = await fetch("/api/settings/branding/logo", { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      setLogoUrl("")
      onLogoUploaded?.("")
      onToast("Logo removed")
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : "Logo delete failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    await onSave({
      primary_color: brandColor,
      logo_url: logoUrl || null,
      agreement_header_title: headerTitle,
      agreement_footer_text: footerText,
      agreement_ref_prefix: refPrefix.toUpperCase().slice(0, 12),
      agreement_ref_start: parseInt(refStart, 10) || 1000,
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
        <h4 className="text-xs font-bold text-[#111111]">Agency Logo</h4>
        <div className="flex flex-wrap items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Agency logo" className="h-16 max-w-[200px] object-contain rounded border border-slate-200 bg-white p-2" />
          ) : (
            <div className="h-16 w-32 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">No logo</div>
          )}
          {!disabled && (
            <div className="flex gap-2">
              <label className="cursor-pointer inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                <span className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5 mr-1" /> {logoUrl ? "Replace" : "Upload"}
                </span>
              </label>
              {logoUrl && (
                <Button type="button" variant="outline" disabled={uploading} onClick={deleteLogo} className="rounded-xl text-xs text-red-600">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Brand Colour
          <div className="flex items-center gap-3">
            <input type="color" value={brandColor} disabled={disabled} onChange={(e) => onBrandColorChange(e.target.value)} className="h-11 w-14 rounded cursor-pointer" />
            <Input value={brandColor} disabled={disabled} onChange={(e) => onBrandColorChange(e.target.value)} className="h-11 rounded-xl font-mono text-sm" />
          </div>
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Agreement Reference Prefix
          <Input value={refPrefix} disabled={disabled} onChange={(e) => setRefPrefix(e.target.value.toUpperCase())} placeholder="AVC" className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500">
          Starting Number
          <Input type="number" value={refStart} disabled={disabled} onChange={(e) => setRefStart(e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Agreement Header Title
          <Input value={headerTitle} disabled={disabled} onChange={(e) => setHeaderTitle(e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2 text-xs font-bold text-slate-500 md:col-span-2">
          Agreement Footer Text
          <Textarea value={footerText} disabled={disabled} onChange={(e) => setFooterText(e.target.value)} className="min-h-[80px] rounded-xl" />
        </label>
      </div>

      {!disabled && (
        <Button type="button" onClick={handleSave} className="rounded-xl bg-[#111111] font-bold hover:bg-[#222222]">Save Settings</Button>
      )}
    </div>
  )
}
