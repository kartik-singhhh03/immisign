import { CardSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-4">
      <CardSkeleton />
      <CardSkeleton className="min-h-[200px]" />
    </div>
  )
}
