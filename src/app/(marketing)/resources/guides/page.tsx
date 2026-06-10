import { ResourcesGuidesContent } from "@/components/marketing/website/ResourcesGuidesContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Guides",
  description: "Step-by-step migration practice guides for agreements, compliance, and team setup.",
  path: "/resources/guides",
})

export default function ResourcesGuidesPage() {
  return <ResourcesGuidesContent />
}
