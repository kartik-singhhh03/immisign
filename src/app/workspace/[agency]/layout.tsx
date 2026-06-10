import { DashboardShell } from "@/components/layout/dashboard-shell"
import { WorkspaceAccessGuard } from "@/components/layout/workspace-access-guard"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <WorkspaceAccessGuard>{children}</WorkspaceAccessGuard>
    </DashboardShell>
  )
}
