"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Typography tokens — Agreement workspace reference */
export const pageHeaderTypography = {
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]",
  title: "mt-1 font-serif text-3xl font-normal tracking-tight text-[#111111] md:text-4xl",
  description: "mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#5C5C5C]",
} as const

/**
 * Canonical ImmiMate page header — matches Agreement workspace typography exactly.
 * Serif title (Instrument), sans eyebrow + description.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  variant = "default",
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** wizard = no bottom rule, tighter spacing (wizards & sub-flows) */
  variant?: "default" | "wizard"
}) {
  return (
    <header
      className={cn(
        "animate-enter flex flex-col justify-between gap-5 md:flex-row md:items-end",
        variant === "default"
          ? "mb-8 border-b border-[#E7E7E7] pb-6"
          : "mb-6",
        className,
      )}
    >
      <div>
        {eyebrow && <p className={pageHeaderTypography.eyebrow}>{eyebrow}</p>}
        <h1 className={pageHeaderTypography.title}>{title}</h1>
        {description && <p className={pageHeaderTypography.description}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
