"use client"

import React from "react"
import { Download, RefreshCw, Archive, Send, FileText, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusPill } from "@/components/saas/dashboard-pages"
import { Agreement, AuditEvent } from "../../types"
import { useAuthStore } from "@/store/authStore"
import { Role, canEdit, canDelete } from "@/features/auth/types/roles"

import { sendAgreementForSignatureAction } from "@/features/agreements/actions/agreements"

export function AgreementDashboard({ 
  agreement, 
  agencySlug, 
  auditLogs,
  documentUrl 
}: { 
  agreement: Agreement, 
  agencySlug: string, 
  auditLogs: AuditEvent[],
  documentUrl: string | null | undefined
}) {
  const [sending, setSending] = React.useState(false);
  const user = useAuthStore((s) => s.user)
  const role = (user?.role || 'Read-only staff') as Role
  const isEditor = canEdit(role, 'agreements')
  const isDeleter = canDelete(role, 'agreements')

  const handleSend = async () => {
    try {
      setSending(true);
      const role = 'agency_admin' as any; // mock
      await sendAgreementForSignatureAction(agreement.agency_id, agreement.created_by, role, agreement.id);
      alert('Agreement sent successfully!');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Failed to send agreement');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-enter space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Workspace"
        title={agreement.title || "Agreement Details"}
        description={`Manage document lifecycle, view execution status, and audit trail for ${agreement.agreement_number}.`}
        action={
          <div className="flex gap-3">
            {isDeleter && (
              <Button variant="outline" className="rounded-xl border-slate-200 bg-white font-bold shadow-sm">
                <Archive className="h-4 w-4 mr-1.5" /> Archive
              </Button>
            )}
            {isEditor && (
              <Button 
                onClick={handleSend}
                disabled={sending || agreement.status === 'signed' || !documentUrl}
                className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52] disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-1.5" /> 
                {sending ? 'Sending...' : 'Request Signature'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Metadata */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-[#081B2E]">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</div>
                <div className="mt-1.5"><StatusPill status={agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)} /></div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Agreement ID</div>
                <div className="text-sm font-semibold text-[#081B2E] mt-1">{agreement.agreement_number}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Created Date</div>
                <div className="text-sm font-semibold text-[#081B2E] mt-1">{new Date(agreement.created_at).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-[#081B2E]">Entities</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Client UUID</div>
                <div className="text-xs font-semibold text-[#081B2E] mt-1 break-all">{agreement.client_id || "Unlinked"}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Matter Type UUID</div>
                <div className="text-xs font-semibold text-[#081B2E] mt-1 break-all">{agreement.matter_type_id || "Unlinked"}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER PANEL: PDF Viewer */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm overflow-hidden bg-slate-50 flex flex-col h-[800px]">
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0D9F8C]" />
                <h3 className="font-bold text-[#081B2E] text-sm">Generated Document</h3>
              </div>
              <div className="flex gap-2">
                {isEditor && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800">
                    <RefreshCw className="h-3 w-3 mr-1.5" /> Regenerate
                  </Button>
                )}
                {documentUrl && (
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-slate-200 shadow-sm" asChild>
                    <a href={documentUrl} target="_blank" rel="noreferrer">
                      <Download className="h-3 w-3 mr-1.5" /> Download PDF
                    </a>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 bg-slate-200/50 p-6 overflow-hidden relative">
              {documentUrl ? (
                <iframe 
                  src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-full rounded-xl border border-slate-300 shadow-sm bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-300 mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-[#081B2E] font-bold text-lg">No Document Generated</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mt-2">
                    This agreement is still in Draft state. Generate the document to preview the official PDF here.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: Timeline */}
        <div className="lg:col-span-3">
          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm h-full max-h-[800px] flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-[#081B2E]">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="p-6 relative">
                <div className="absolute left-8 top-6 bottom-6 w-px bg-slate-200" />
                
                <div className="space-y-6 relative">
                  {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="relative mt-1">
                        <div className="h-4 w-4 rounded-full border-2 border-white bg-[#0D9F8C] ring-1 ring-slate-200 shadow-sm flex items-center justify-center relative z-10">
                          {log.action.includes('Generated') || log.action.includes('Created') ? (
                            <CheckCircle2 className="h-2 w-2 text-white" />
                          ) : (
                            <Clock className="h-2 w-2 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="text-xs font-bold text-[#081B2E]">{log.action}</div>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        {log.metadata && log.metadata.storagePath && (
                          <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-mono text-slate-500 break-all">
                            Stored: {log.metadata.storagePath.split('/').pop()}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs font-semibold text-slate-400 pl-8">No audit events recorded yet.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
