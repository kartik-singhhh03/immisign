"use client"

import * as React from "react"
import ReactSignatureCanvas from "react-signature-canvas"
import { cn } from "@/lib/utils"

const PAD_HEIGHT = 160

export type AgreementSignaturePadHandle = {
  isEmpty: () => boolean
  getDataUrl: () => string
  clear: () => void
}

type Props = {
  className?: string
  onSignatureChange?: (hasSignature: boolean) => void
}

/** Export signature PNG — never call getTrimmedCanvas (broken in alpha build). */
function readSignatureDataUrl(pad: ReactSignatureCanvas): string {
  const extended = pad as ReactSignatureCanvas & { toDataURL?: (type?: string) => string }
  if (typeof extended.toDataURL === "function") {
    return extended.toDataURL("image/png")
  }
  return pad.getCanvas().toDataURL("image/png")
}

/** Ref-forwarding signature pad with 1:1 canvas coordinates (no CSS scale offset). */
export const AgreementSignaturePad = React.forwardRef<AgreementSignaturePadHandle, Props>(
  function AgreementSignaturePad({ className, onSignatureChange }, ref) {
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const padRef = React.useRef<ReactSignatureCanvas | null>(null)
    const [canvasWidth, setCanvasWidth] = React.useState(0)

    React.useLayoutEffect(() => {
      const width = containerRef.current?.clientWidth ?? 0
      if (width > 0) setCanvasWidth(width)
    }, [])

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
        return readSignatureDataUrl(padRef.current)
      },
      clear() {
        padRef.current?.clear()
        onSignatureChange?.(false)
      },
    }))

    return (
      <div
        ref={containerRef}
        className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden w-full", className)}
        style={{ height: PAD_HEIGHT }}
      >
        {canvasWidth > 0 ? (
          <ReactSignatureCanvas
            ref={padRef}
            penColor="#111111"
            minWidth={1.5}
            maxWidth={2.5}
            clearOnResize={false}
            onEnd={syncHasSignature}
            canvasProps={{
              width: canvasWidth,
              height: PAD_HEIGHT,
              className: "touch-none block",
              style: { width: canvasWidth, height: PAD_HEIGHT },
            }}
            backgroundColor="#ffffff"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Loading signature pad…
          </div>
        )}
      </div>
    )
  },
)
