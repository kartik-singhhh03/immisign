import { PageHeader } from "@/components/layout/PageHeader"

export function PlaceholderPage({
  eyebrow,
  title,
  description = "This page is being prepared.",
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="animate-enter space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
    </div>
  )
}
