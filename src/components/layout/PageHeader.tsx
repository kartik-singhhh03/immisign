"use client"

import * as React from "react"

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="animate-enter mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081B2E] md:text-4xl">
          {title}
        </h1>
        <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-slate-500 font-medium">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
