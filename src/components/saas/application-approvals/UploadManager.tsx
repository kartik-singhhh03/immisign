import React, { useRef, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { notifyError, notifySuccess } from "@/lib/ux/feedback"

interface UploadManagerProps {
  approvalId: string
}

export function UploadManager({ approvalId }: UploadManagerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)

  const uploadOne = async (file: File) => {
    if (!activeWorkspace?.id) {
      notifyError("Workspace required", "Select a workspace before uploading.")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/approvals/${approvalId}/attachments`, {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      notifySuccess("Document uploaded", file.name)
      window.location.reload()
    } catch (e: unknown) {
      notifyError(
        "Upload failed",
        e instanceof Error ? e.message : "Could not upload file",
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    await uploadOne(file)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    await handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${isDragging ? "border-[#111111] bg-[#111111]/5" : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="presentation"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,image/*"
        onChange={(e) => {
          void handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <UploadCloud
        className={`h-10 w-10 mx-auto mb-4 ${isDragging ? "text-[#111111]" : "text-slate-400"}`}
      />
      <h3 className="font-bold text-slate-700 text-lg">Drag & drop application documents</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
        Upload forms, statutory declarations, and cover letters that require client review.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6 font-bold"
        disabled={uploading}
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
      >
        {uploading ? "Uploading…" : "Browse files"}
      </Button>
    </div>
  )
}
