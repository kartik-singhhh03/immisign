"use client"

import * as React from "react"
import ReactSignatureCanvas from "react-signature-canvas"
import { cn } from "@/lib/utils"

export type AgreementSignaturePadHandle = {
  isEmpty: () => boolean
  getDataUrl: () => string
  clear: () => void
}

type Props = {
  className?: string
  onSignatureChange?: (hasSignature: boolean) => void
}

/** Ref-forwarding signature pad — avoids next/dynamic breaking refs. */
export const AgreementSignaturePad = React.forwardRef<AgreementSignaturePadHandle, Props>(
  function AgreementSignaturePad({ className, onSignatureChange }, ref) {
    const padRef = React.useRef<ReactSignatureCanvas | null>(null)
    const containerRef = React.useRef<HTMLDivElement | null>(null)

    const syncHasSignature = React.useCallback(() => {
      const has = !(padRef.current?.isEmpty() ?? true)
      onSignatureChange?.(has)
      return has
    }, [onSignatureChange])

    React.useImperativeHandle(ref, () => ({
      isEmpty() {
        return padRef.current?.isEmpty() ?? true
      },
      getDataUrl() {
        if (!padRef.current || padRef.current.isEmpty()) return ""
        return padRef.current.getTrimmedCanvas().toDataURL("image/png")
      },
      clear() {
        padRef.current?.clear()
        onSignatureChange?.(false)
      },
    }))

    React.useEffect(() => {
      const pad = padRef.current
      const container = containerRef.current
      if (!pad || !container) return

      const resize = () => {
        const canvas = pad.getCanvas()
        const width = Math.max(container.clientWidth, 280)
        const height = 160
        canvas.width = width
        canvas.height = height
        canvas.style.width = "100%"
        canvas.style.height = `${height}px`
      }

      resize()
      window.addEventListener("resize", resize)
      return () => window.removeEventListener("resize", resize)
    }, [])

    return (
      <div ref={containerRef} className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
        <ReactSignatureCanvas
          ref={padRef}
          penColor="#111111"
          minWidth={1.5}
          maxWidth={2.5}
          onEnd={syncHasSignature}
          canvasProps={{
            className: "touch-none block w-full",
            style: { height: "160px" },
          }}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>
    )
  },
)
