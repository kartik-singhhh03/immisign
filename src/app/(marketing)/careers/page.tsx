import { CareersPageContent } from "@/components/marketing/website/CareersPageContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Careers",
  description: "Join the ImmiMate team and help migration practices stay audit-ready.",
  path: "/careers",
})

export default function CareersPage() {
  return <CareersPageContent />
}
