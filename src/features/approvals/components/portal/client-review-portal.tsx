"use client"

import React, { useState } from "react"
import { CheckCircle2, ShieldAlert, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clientApproveAction, clientRequestChangesAction } from "@/features/approvals/actions/client-portal-actions"
import { pageHeaderTypography } from "@/components/layout/PageHeader"

export function ClientReviewPortal({ approval, token, documentUrl }: { approval: { client_signed_at?: string; status: string; signwell_document_id?: string | null; client_sent_at?: string | null }, token: string, documentUrl: string }) {
  const requiresSignWell = Boolean(approval.signwell_document_id)
  const [submitting, setSubmitting] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState("")

  const handleApprove = async () => {
    try {
      setSubmitting(true)
      await clientApproveAction(token)
      alert("Document approved successfully!")
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert("Failed to approve. Link may be expired.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!comment) return alert("Please provide details on what needs to be changed.")
    try {
      setSubmitting(true)
      await clientRequestChangesAction(token, comment)
      alert("Feedback sent successfully!")
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert("Failed to submit feedback.")
    } finally {
      setSubmitting(false)
    }
  }

  if (approval.client_signed_at || approval.status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-200">
          <CheckCircle2 className="h-16 w-16 text-[#111111] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-normal tracking-tight text-[#111111]">Document Approved</h1>
          <p className="mt-3 text-sm text-slate-500 font-medium">Thank you for reviewing. Your agent has been notified.</p>
        </div>
      </div>
    )
  }

  if (approval.status === 'changes_requested') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-200">
          <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-normal tracking-tight text-[#111111]">Changes Requested</h1>
          <p className="mt-3 text-sm text-slate-500 font-medium">Your agent is working on the revisions and will send a new link shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      
      {/* Mobile-friendly PDF Viewer */}
      <div className="flex-1 h-[60vh] md:h-screen bg-slate-200 border-r border-slate-300 relative">
        <iframe 
          src={`${documentUrl}#toolbar=0&navpanes=0`} 
          className="w-full h-full"
          title="Application Document"
        />
      </div>

      {/* Action Panel */}
      <div className="w-full md:w-96 bg-white flex flex-col p-6 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 md:h-screen overflow-y-auto">
        <div className="mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <p className={pageHeaderTypography.eyebrow}>Application Review</p>
          <h1 className={pageHeaderTypography.title}>Please review your application</h1>
          <p className={pageHeaderTypography.description}>
            Please carefully review the attached document. By approving, you confirm all details are correct and authorize lodgement.
          </p>
        </div>

        {!showReject ? (
          <div className="space-y-3 mt-auto">
            {requiresSignWell ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-900 font-medium">
                <p className="font-bold mb-1">Electronic signature required</p>
                <p>Check your email for the SignWell signing link. Use that link to approve and sign this application.</p>
              </div>
            ) : (
              <Button 
                onClick={handleApprove} 
                disabled={submitting}
                className="w-full h-14 bg-[#111111] hover:bg-[#222222] font-bold text-lg rounded-xl shadow-md"
              >
                Approve Document
              </Button>
            )}
            <Button 
              onClick={() => setShowReject(true)} 
              variant="outline"
              disabled={submitting}
              className="w-full h-12 font-bold text-slate-600 rounded-xl"
            >
              Request Changes
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-auto">
            <h3 className="font-bold text-sm text-slate-700">What needs to be changed?</h3>
            <textarea 
              className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-[#111111] outline-none"
              placeholder="e.g. My passport number has a typo..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => setShowReject(false)} variant="ghost" className="flex-1 font-bold">Cancel</Button>
              <Button disabled={submitting || !comment} onClick={handleReject} className="flex-1 bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-sm">
                Submit <Send className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
