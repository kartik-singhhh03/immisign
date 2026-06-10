"use client"

import { buildFeeComparison, formatAud } from "../lib/fee-comparison"

export function FeeComparisonBlock({
  quoted,
  actual,
}: {
  quoted: number
  actual: number
}) {
  const comparison = buildFeeComparison(quoted, actual)
  if (!comparison) return null

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
        Fee Comparison (quoted vs actual)
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[#6b7280]">Quoted Fee:</span>
          <span className="font-medium">{formatAud(comparison.quoted)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7280]">Actual Fee:</span>
          <span className="font-medium">{formatAud(comparison.actual)}</span>
        </div>
        <div className="flex justify-between border-t border-amber-200 pt-2 font-semibold text-amber-900">
          <span>Difference:</span>
          <span>{formatAud(comparison.difference)}</span>
        </div>
      </div>
    </div>
  )
}
