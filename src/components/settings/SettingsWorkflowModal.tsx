"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: "md" | "lg" | "xl" | "fullscreen"
}

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  fullscreen: "max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh]",
}

export function SettingsWorkflowModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = "lg",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl overflow-hidden flex flex-col",
          sizeClass[size],
          className,
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold text-[#111111]">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto immimate-scroll px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
