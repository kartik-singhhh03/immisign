import { ResourcesBlogContent } from "@/components/marketing/website/ResourcesBlogContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Blog",
  description: "Compliance insights, product updates, and best practices for migration agents.",
  path: "/resources/blog",
})

export default function ResourcesBlogPage() {
  return <ResourcesBlogContent />
}
