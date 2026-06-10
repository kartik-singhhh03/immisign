"use client"

import { cn } from "@/lib/utils"

type PaginationBarProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationBarProps) {
  if (totalPages <= 1 && total <= pageSize) return null

  const btn =
    "rounded-lg border border-[#E7E7E7] px-3 py-1.5 text-xs font-semibold text-[#232323] disabled:opacity-40 hover:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-[#111111]/20"

  return (
    <footer
      className={cn(
        "flex flex-col gap-3 border-t border-[#E7E7E7] px-4 py-3 text-xs text-[#5C5C5C] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span>
        Page {page} of {totalPages || 1} · {total} records
      </span>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className={btn}>
          First
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={btn}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={btn}
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={btn}
        >
          Last
        </button>
      </div>
    </footer>
  )
}
