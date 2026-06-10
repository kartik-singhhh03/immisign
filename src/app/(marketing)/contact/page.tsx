import { ContactPage } from "@/components/saas/marketing-pages"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Contact",
  description: "Contact the ImmiMate team for support, partnerships, or general enquiries.",
  path: "/contact",
})

export default function Page() {
  return <ContactPage />
}
