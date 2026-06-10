"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  FileCheck2,
  FileSignature,
  FileText,
  FolderOpen,
  Users,
  Bell,
  ListTodo,
  BarChart3,
} from "lucide-react"

type ModuleKey =
  | "clients"
  | "agreements"
  | "approvals"
  | "documents"
  | "tasks"
  | "notifications"
  | "reports"
  | "analytics"

const presets: Record<
  ModuleKey,
  { icon: React.ReactNode; title: string; description: string; actionLabel?: string; actionHref?: string }
> = {
  clients: {
    icon: <Users className="h-8 w-8 text-slate-400" />,
    title: "No clients yet",
    description:
      "Create your first client to begin managing migration matters, agreements, and approvals from one record.",
    actionLabel: "Create client",
  },
  agreements: {
    icon: <FileSignature className="h-8 w-8 text-slate-400" />,
    title: "No agreements yet",
    description: "Start a MARA-compliant service agreement when you are ready to engage a client.",
    actionLabel: "New agreement",
  },
  approvals: {
    icon: <FileCheck2 className="h-8 w-8 text-slate-400" />,
    title: "No application approvals",
    description: "Create an approval record to track lodgement readiness and client sign-off.",
    actionLabel: "New approval",
  },
  documents: {
    icon: <FolderOpen className="h-8 w-8 text-slate-400" />,
    title: "No documents in library",
    description: "Upload templates or send documents for signature from your workspace.",
    actionLabel: "Send document",
  },
  tasks: {
    icon: <ListTodo className="h-8 w-8 text-slate-400" />,
    title: "No tasks",
    description: "Tasks linked to matters and deadlines will appear here when created.",
  },
  notifications: {
    icon: <Bell className="h-8 w-8 text-slate-400" />,
    title: "No notifications",
    description: "Workspace activity and alerts will show here as they occur.",
  },
  reports: {
    icon: <FileText className="h-8 w-8 text-slate-400" />,
    title: "No reports available",
    description: "Reports are generated from your agency data when records exist.",
  },
  analytics: {
    icon: <BarChart3 className="h-8 w-8 text-slate-400" />,
    title: "No analytics data",
    description: "Analytics reflect real workspace activity once agreements and clients exist.",
  },
}

export function PageEmptyState({
  module,
  actionHref,
  onAction,
}: {
  module: ModuleKey
  actionHref?: string
  onAction?: () => void
}) {
  const p = presets[module]
  const href = actionHref || p.actionHref
  const action =
    p.actionLabel && (href || onAction) ? (
      href ? (
        <Button asChild className="rounded-xl bg-[#111111] font-bold">
          <Link href={href}>{p.actionLabel}</Link>
        </Button>
      ) : (
        <Button type="button" onClick={onAction} className="rounded-xl bg-[#111111] font-bold">
          {p.actionLabel}
        </Button>
      )
    ) : undefined

  return (
    <EmptyState
      icon={p.icon}
      title={p.title}
      description={p.description}
      action={action}
      className="min-h-[320px] border-slate-200/60 bg-white/50"
    />
  )
}
