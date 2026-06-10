import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("immimate-skeleton rounded-xl", className)}
      {...props}
    />
  )
}

export function ImmiMateSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={className} {...props} />
}

export { Skeleton }
