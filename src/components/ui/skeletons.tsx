import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("immimate-card space-y-4", className)} aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-3/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="immimate-card overflow-hidden p-0" aria-hidden="true">
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-[#E7E7E7] px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <li key={i} className="immimate-card space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </li>
      ))}
    </ul>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in-50" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-3 border-b border-[#E7E7E7] pb-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <TableSkeleton rows={5} cols={4} />
        <CardSkeleton className="h-64" />
      </div>
    </div>
  )
}

export function WorkspaceShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA]" aria-busy="true" aria-label="Loading application shell">
      <div className="hidden lg:flex w-[260px] flex-col border-r border-[#E7E7E7] bg-white p-4 gap-2">
        <Skeleton className="h-10 w-full mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <DashboardSkeleton />
      </div>
    </div>
  )
}
