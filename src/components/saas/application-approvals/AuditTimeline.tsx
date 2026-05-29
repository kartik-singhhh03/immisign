import React from "react"
import { ApprovalAuditEvent } from "@/types/approval-domain"

interface AuditTimelineProps {
  events: ApprovalAuditEvent[]
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return <div className="text-sm text-slate-500 font-medium p-4 text-center">No activity recorded yet.</div>
  }

  return (
    <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
      {events.map((evt) => (
        <div key={evt.id} className="relative pl-6">
          <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
            evt.type === 'approved' ? 'bg-[#0D9F8C]' :
            evt.type === 'sent' ? 'bg-blue-400' :
            evt.type === 'reminder_sent' ? 'bg-amber-400' :
            'bg-slate-300'
          }`} />
          <p className="text-sm font-semibold text-slate-900">{evt.description}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {new Date(evt.created_at).toLocaleString()} • {evt.actor_name}
          </p>
        </div>
      ))}
    </div>
  )
}
