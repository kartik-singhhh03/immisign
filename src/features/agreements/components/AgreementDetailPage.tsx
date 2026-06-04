"use client"
import * as React from "react"
import { useParams } from "next/navigation"
import { useAgreements } from "@/lib/hooks/useSupabaseData"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Send, FileText } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusPill } from "@/components/saas/dashboard-pages"
import { cn } from "@/lib/utils"

export function AgreementDetailPage() {
  const params = useParams()
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  const agreementId = path[1]

  const { data: agreements, loading } = useAgreements()
  
  const agreement = agreements?.find((a: any) =>
    a.id === agreementId ||
    a.real_id === agreementId ||
    a.ref === agreementId,
  )

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading agreement details...</div>
  }

  if (!agreement) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Agreement not found or access denied.
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={agreement.id}
        title={`${agreement.client} - ${agreement.matter}`}
        description="Agreement preview, signer status and audit timeline in one record."
        action={<Button className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_8px_20px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"><Send className="h-4 w-4 mr-1" />Send reminder</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-8">
            <div className="rounded-2xl border border-slate-200 bg-[#F7FAF8] p-8 text-center md:text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] mb-6 shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#081B2E]">Service agreement preview</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 font-medium">
                Professional services agreement for {agreement.matter} with fee schedule, scope and terms ready for signature.
              </p>
              <div className="mt-6 text-sm">
                <strong>Status:</strong> <StatusPill status={agreement.status} />
              </div>
              <div className="mt-4 text-sm">
                <strong>Fee:</strong> {agreement.fee}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold tracking-tight text-[#081B2E] mb-5">Audit timeline</h2>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {[
                { label: "Agreement created", date: agreement.date, status: "completed" },
                { label: "Preview generated", date: agreement.date, status: "completed" },
                { label: "Sent to client", date: "Pending", status: (agreement.status === "Sent" || agreement.status === "Signed") ? "completed" : "pending" },
                { label: "Client signed", date: "Pending", status: agreement.status === "Signed" ? "completed" : "pending" }
              ].map((item, index) => (
                <div key={item.label} className="flex gap-4 relative">
                  <div className={cn("mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm z-10", item.status === "completed" ? "bg-[#0D9F8C]" : "bg-slate-200")} />
                  <div>
                    <div className={cn("text-sm font-bold", item.status === "completed" ? "text-[#081B2E]" : "text-slate-400")}>{item.label}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.status === "completed" ? item.date : 'Pending'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
