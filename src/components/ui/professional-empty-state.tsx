import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ProfessionalEmptyState({
  icon,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  actionHref?: string
  actionLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-[#E7E7E7] bg-white px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-[#5C5C5C]">
          {icon}
        </div>
      )}
      <h3 className="section-title text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium text-[#5C5C5C] leading-relaxed">
        {description}
      </p>
      {(action || (actionHref && actionLabel)) && (
        <div className="mt-6">
          {action}
          {!action && actionHref && actionLabel && (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
