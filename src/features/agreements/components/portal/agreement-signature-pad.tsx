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

function readSignatureDataUrl(pad: ReactSignatureCanvas): string {
  const asAny = pad as ReactSignatureCanvas & {
    getTrimmedCanvas?: () => HTMLCanvasElement
    toDataURL?: (type?: string) => string
  }
  if (typeof asAny.getTrimmedCanvas === "function") {
    return asAny.getTrimmedCanvas().toDataURL("image/png")
  }
  if (typeof asAny.toDataURL === "function") {
    return asAny.toDataURL("image/png")
  }
  return pad.getCanvas().toDataURL("image/png")
}

/** Ref-forwarding signature pad — avoids next/dynamic breaking refs. */
export const AgreementSignaturePad = React.forwardRef<AgreementSignaturePadHandle, Props>(
  function AgreementSignaturePad({ className, onSignatureChange }, ref) {
    const padRef = React.useRef<ReactSignatureCanvas | null>(null)

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
      <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
        <ReactSignatureCanvas
          ref={padRef}
          penColor="#111111"
          minWidth={1.5}
          maxWidth={2.5}
          clearOnResize={false}
          onEnd={syncHasSignature}
          canvasProps={{
            className: "touch-none block w-full",
            width: 560,
            height: 160,
            style: { width: "100%", height: "160px" },
          }}
          backgroundColor="rgba(255,255,255,1)"
        />
      </div>
    )
  },
)
