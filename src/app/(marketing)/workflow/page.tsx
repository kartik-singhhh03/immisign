import { WorkflowPageContent } from "@/components/marketing/website/WorkflowPageContent"
import { marketingMetadata } from "@/lib/marketing/seo"

export const metadata = marketingMetadata({
  title: "Workflow",
  description:
    "See how ImmiMate connects inquiry, onboarding, agreements, compliance, approvals, and lodgement in one audit-ready journey.",
  path: "/workflow",
})

export default function WorkflowPage() {
  return <WorkflowPageContent />
}
