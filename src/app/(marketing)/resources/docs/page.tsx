import { ResourcesDocsContent } from "@/components/marketing/website/ResourcesDocsContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Documentation",
  description: "ImmiMate product documentation — getting started, clients, agreements, and compliance.",
  path: "/resources/docs",
})

export default function ResourcesDocsPage() {
  return <ResourcesDocsContent />
}
