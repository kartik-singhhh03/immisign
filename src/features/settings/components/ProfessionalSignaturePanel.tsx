"use client"

import * as React from "react"
import { Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  PROFESSIONAL_SIGNATURE_MAX_BYTES,
  PROFESSIONAL_SIGNATURE_MIN_HEIGHT,
  PROFESSIONAL_SIGNATURE_MIN_WIDTH,
} from "@/lib/signatures/professional-signature"

type ProfessionalSignature = {
  id: string
  storagePath: string
  uploadedAt: string
  previewUrl: string | null
}

type Props = {
  onToast: (message: string) => void
}

function validateClientPng(file: File): string | null {
  if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
    return "Only PNG files are allowed."
  }
  if (file.size > PROFESSIONAL_SIGNATURE_MAX_BYTES) {
    return "File must be 2 MB or smaller."
  }
  return null
}

export function ProfessionalSignaturePanel({ onToast }: Props) {
  const [signature, setSignature] = React.useState<ProfessionalSignature | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const loadSignature = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/signatures/professional", {
        credentials: "include",
        cache: "no-store",
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || `Failed to load signature (${res.status})`)
      }
      setSignature(payload.signature || null)
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Could not load professional signature.")
    } finally {
      setLoading(false)
    }
  }, [onToast])

  React.useEffect(() => {
    void loadSignature()
  }, [loadSignature])

  const uploadFile = async (file: File) => {
    const basicError = validateClientPng(file)
    if (basicError) {
      setValidationError(basicError)
      return
    }

    setValidationError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.set("file", file)
      const res = await fetch("/api/signatures/professional", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Upload failed")
      setSignature(payload.signature)
      onToast(signature ? "Professional signature replaced." : "Professional signature uploaded.")
    } catch (e: unknown) {
      setValidationError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async () => {
    if (!signature) return
    setDeleting(true)
    try {
      const res = await fetch("/api/signatures/professional", {
        method: "DELETE",
        credentials: "include",
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Delete failed")
      setSignature(null)
      onToast("Professional signature removed.")
      await loadSignature()
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  const uploadedLabel = signature?.uploadedAt
    ? new Date(signature.uploadedAt).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Australia/Sydney",
      })
    : null

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/50 bg-white p-5">
      <div>
        <h4 className="text-sm font-bold text-[#111111]">Professional Signature</h4>
        <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-relaxed">
          Upload once — your handwritten signature is automatically embedded in every agreement
          execution block before it is sent to the client. PNG only, transparent background preferred.
          Recommended {PROFESSIONAL_SIGNATURE_MIN_WIDTH}×{PROFESSIONAL_SIGNATURE_MIN_HEIGHT}px minimum
          (ideal 1200×400px), max 2 MB.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500">Current signature</Label>
        <div
          className="relative flex min-h-[120px] items-center justify-center rounded-xl border border-slate-200 p-4"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
            backgroundColor: "#f8fafc",
          }}
        >
          {loading ? (
            <p className="text-xs text-slate-400 animate-pulse">Loading signature…</p>
          ) : signature?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signature.previewUrl}
              alt="Professional signature preview"
              className="max-h-16 max-w-full object-contain"
              onError={() => {
                void loadSignature()
              }}
            />
          ) : signature?.storagePath ? (
            <p className="text-xs font-semibold text-slate-500">Signature on file (refresh preview)</p>
          ) : (
            <p className="text-xs font-semibold text-slate-400">No signature uploaded yet</p>
          )}
        </div>
        {uploadedLabel && (
          <p className="text-[11px] text-slate-500 font-semibold">Uploaded: {uploadedLabel}</p>
        )}
      </div>

      {validationError && (
        <p className="text-xs font-semibold text-rose-600">{validationError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading || loading}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 rounded-xl text-xs font-bold"
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {signature ? "Replace signature" : "Upload signature"}
        </Button>
        {signature && (
          <Button
            type="button"
            variant="ghost"
            disabled={deleting || loading}
            onClick={() => void handleDelete()}
            className="h-9 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
