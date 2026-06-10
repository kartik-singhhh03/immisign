"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TableSkeleton } from "@/components/ui/skeletons"
import { ProfessionalEmptyState } from "@/components/ui/professional-empty-state"

export type ImmiMateTableColumn<T> = {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render?: (row: T) => React.ReactNode
}

export type ImmiMateTableProps<T> = {
  columns: ImmiMateTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  className?: string
  stickyHeader?: boolean
}

export function ImmiMateTable<T>({
  columns,
  data,
  rowKey,
  loading,
  onRowClick,
  rowActions,
  emptyTitle = "No records",
  emptyDescription = "Nothing matches your filters yet.",
  emptyAction,
  page = 1,
  pageSize,
  total,
  onPageChange,
  className,
  stickyHeader = true,
}: ImmiMateTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={6} cols={columns.length} />
  }

  if (!data.length) {
    return (
      <ProfessionalEmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className="min-h-[240px]"
      />
    )
  }

  const totalCount = total ?? data.length
  const pages = pageSize ? Math.ceil(totalCount / pageSize) : 1

  return (
    <div className={cn("immimate-card overflow-hidden p-0", className)}>
      <div className="overflow-x-auto immimate-scroll">
        <table className="w-full min-w-[640px] text-left text-sm" role="table">
          <thead
            className={cn(
              "border-b border-[#E7E7E7] bg-[#FAFAFA] text-[11px] uppercase tracking-wider text-[#5C5C5C]",
              stickyHeader && "sticky top-0 z-10",
            )}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn("px-4 py-3 font-semibold h-12", col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className="px-4 py-3 font-semibold h-12 w-16 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "immimate-table-row border-b border-[#E7E7E7] last:border-0",
                  onRowClick && "cursor-pointer",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 align-middle text-[#111111]", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && onPageChange && totalCount > 0 && (
        <footer className="flex flex-col gap-3 border-t border-[#E7E7E7] px-4 py-3 text-xs text-[#5C5C5C] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {page} of {pages || 1} · {totalCount} records
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              className="rounded-lg border border-[#E7E7E7] px-3 py-1.5 font-semibold disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#111111]/20"
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-[#E7E7E7] px-3 py-1.5 font-semibold disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#111111]/20"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-[#E7E7E7] px-3 py-1.5 font-semibold disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#111111]/20"
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(pages)}
              className="rounded-lg border border-[#E7E7E7] px-3 py-1.5 font-semibold disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#111111]/20"
            >
              Last
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
