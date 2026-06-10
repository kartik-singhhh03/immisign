import { BookDemoPageContent } from "@/components/marketing/website/BookDemoPageContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Book a Demo",
  description: "Schedule a personalised ImmiMate demo for your migration practice.",
  path: "/book-demo",
})

export default function BookDemoPage() {
  return <BookDemoPageContent />
}
