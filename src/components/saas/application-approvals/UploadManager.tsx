import React, { useState } from "react"
import { useApprovalStore } from "@/store/approvalStore"
import { useAuthStore } from "@/store/authStore"
import { UploadCloud, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadManagerProps {
  approvalId: string
}

export function UploadManager({ approvalId }: UploadManagerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const addDocument = useApprovalStore(s => s.addDocument)
  const activeWorkspace = useAuthStore(s => s.activeWorkspace)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!activeWorkspace?.id) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      await addDocument(approvalId, activeWorkspace.id, {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        status: "uploaded",
        url: URL.createObjectURL(file), // Mock URL
        created_by: "system" // Should be actual user
      })
    }
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${isDragging ? 'border-[#0D9F8C] bg-[#0D9F8C]/5' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        // In a real app, this would trigger an input type="file"
        alert("File picker simulation. Try dragging and dropping a file instead.")
      }}
    >
      <UploadCloud className={`h-10 w-10 mx-auto mb-4 ${isDragging ? 'text-[#0D9F8C]' : 'text-slate-400'}`} />
      <h3 className="font-bold text-slate-700 text-lg">Drag & drop application documents</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Upload forms, statutory declarations, and cover letters that require client review.</p>
      <Button variant="outline" className="mt-6 font-bold" onClick={(e) => { e.stopPropagation(); alert("Simulating file browse...")}}>Browse Files</Button>
    </div>
  )
}
