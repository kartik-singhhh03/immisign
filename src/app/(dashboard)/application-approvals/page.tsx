import { ApprovalList } from "@/components/approvals/ApprovalList"

export const metadata = {
  title: "Application Approvals - ImmiMate",
  description: "Manage client application reviews securely."
}

export default function ApplicationApprovalsPage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <ApprovalList />
    </div>
  )
}
