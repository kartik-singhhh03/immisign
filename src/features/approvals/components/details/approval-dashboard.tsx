"use client"

import React, { useState } from "react"
import { Archive, Send, FileText, CheckCircle2, Clock, Copy, Link as LinkIcon, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusPill } from "@/components/saas/dashboard-pages"
import { sendApprovalForReviewAction } from "@/features/approvals/actions/approvals"
import { ApplicationApproval } from "../../types"

export function ApprovalDashboard({ 
  approval, 
  agencySlug, 
  auditLogs,
  portalUrl,
  documentUrl 
}: { 
  approval: ApplicationApproval, 
  agencySlug: string, 
  auditLogs: any[],
  portalUrl: string,
  documentUrl: string
}) {
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSend = async () => {
    try {
      setSending(true)
      const role = 'agency_admin' as any
      // We pass mocked values for user since it's an MVP
      await sendApprovalForReviewAction(approval.agency_id, '00000000-0000-0000-0000-000000000000', role, approval.id)
      alert('Approval request sent successfully! In a real app this would dispatch an email.')
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert('Failed to transition state. Check constraints.')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-enter space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Workspace"
        title={approval.title || "Approval Request"}
        description={`Manage compliance document approval lifecycle.`}
        action={
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200 bg-white font-bold shadow-sm">
              <Archive className="h-4 w-4 mr-1.5" /> Archive
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sending || approval.status === 'approved'}
              className="rounded-xl bg-[#0D9F8C] font-bold shadow-sm hover:bg-[#0A5B52] disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-1.5" /> 
              {sending ? 'Sending...' : 'Send Review Link'}
            </Button>
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
                <div className="mt-1.5"><StatusPill status={approval.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} /></div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Visa Subclass</div>
                <div className="text-sm font-semibold text-[#081B2E] mt-1">{approval.visa_subclass || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Version</div>
                <div className="text-sm font-semibold text-[#081B2E] mt-1">v{approval.version_number}.{approval.revision_count}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden border border-emerald-100">
            <CardHeader className="pb-3 border-b border-emerald-100 bg-emerald-50/50">
              <CardTitle className="text-sm font-black text-[#0D9F8C] flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> Client Link
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 font-medium mb-3">Share this secure link with the client to access the review portal.</p>
              <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs font-mono text-slate-400 truncate flex-1 bg-slate-50">
                  {portalUrl}
                </div>
                <Button onClick={handleCopy} variant="ghost" size="sm" className="h-auto rounded-none border-l border-slate-200 hover:bg-slate-100 px-3">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
                </Button>
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
                <h3 className="font-bold text-[#081B2E] text-sm">Application Document</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-slate-200 shadow-sm">
                  Upload Revision
                </Button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-200/50 p-6 overflow-hidden relative">
              <iframe 
                src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                className="w-full h-full rounded-xl border border-slate-300 shadow-sm bg-white"
                title="PDF Preview"
              />
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
                          {log.action.includes('Approved') || log.action.includes('Created') ? (
                            <CheckCircle2 className="h-2 w-2 text-white" />
                          ) : log.action.includes('Changes') ? (
                            <ShieldAlert className="h-2 w-2 text-white" />
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
                        {log.metadata?.comment_preview && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-700">
                            "{log.metadata.comment_preview}"
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
