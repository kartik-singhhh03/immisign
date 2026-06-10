"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minus,
  Plus,
  Printer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsWorkflowModal } from "@/components/settings/SettingsWorkflowModal"

type Props = {
  pdfUrl: string | null
  loading?: boolean
  error?: string | null
  title?: string
  showFullscreenButton?: boolean
}

export function AgreementPdfViewer({
  pdfUrl,
  loading,
  error,
  title = "Agreement PDF",
  showFullscreenButton = true,
}: Props) {
  const [zoom, setZoom] = React.useState(100)
  const [fullscreen, setFullscreen] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const adjustZoom = (delta: number) => {
    setZoom((z) => Math.min(200, Math.max(50, z + delta)))
  }

  const handlePrint = () => {
    if (!pdfUrl) return
    const w = window.open(pdfUrl, '_blank')
    w?.focus()
    w?.print()
  }

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = 'agreement-preview.pdf'
    a.click()
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#fafbfc] px-3 py-2 rounded-t-xl">
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => adjustZoom(-10)}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs font-bold text-slate-600 min-w-[3rem] text-center">{zoom}%</span>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => adjustZoom(10)}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setZoom(100)}>
        Fit Width
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setZoom(85)}>
        Fit Page
      </Button>
      <div className="flex-1" />
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={handlePrint} disabled={!pdfUrl}>
        <Printer className="h-3.5 w-3.5 mr-1" /> Print
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={handleDownload} disabled={!pdfUrl}>
        <Download className="h-3.5 w-3.5 mr-1" /> Download
      </Button>
      {showFullscreenButton && (
        <Button type="button" size="sm" className="h-8 rounded-lg bg-[#111111] hover:bg-[#222222]" onClick={() => setFullscreen(true)} disabled={!pdfUrl}>
          <Maximize2 className="h-3.5 w-3.5 mr-1" /> Review Full Agreement
        </Button>
      )}
    </div>
  )

  const viewerBody = (
    <div className="relative flex-1 min-h-[480px] bg-slate-100 overflow-auto rounded-b-xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
          Generating PDF preview…
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-600 px-6 text-center">
          {error}
        </div>
      )}
      {pdfUrl && !loading && (
        <iframe
          ref={iframeRef}
          title={title}
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          className="w-full min-h-[640px] border-0 bg-white origin-top-left"
          style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${64000 / zoom}px` }}
        />
      )}
    </div>
  )

  return (
    <>
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
        {toolbar}
        {viewerBody}
      </div>

      <SettingsWorkflowModal
        open={fullscreen}
        onOpenChange={setFullscreen}
        title="Full Agreement Review"
        description="Review the complete agreement before sending."
        size="fullscreen"
      >
        <div className="flex flex-col h-full min-h-[80vh] -mx-2">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => adjustZoom(-10)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs font-bold">{zoom}%</span>
            <Button type="button" variant="outline" size="sm" onClick={() => adjustZoom(10)}><ChevronRight className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="sm" onClick={handlePrint}><Printer className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}><Download className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-100 rounded-xl">
            {pdfUrl && (
              <iframe
                title={`${title} fullscreen`}
                src={`${pdfUrl}#toolbar=1`}
                className="w-full min-h-[85vh] border-0 bg-white"
              />
            )}
          </div>
        </div>
      </SettingsWorkflowModal>
    </>
  )
}
