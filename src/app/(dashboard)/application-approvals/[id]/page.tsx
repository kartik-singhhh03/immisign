"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useApprovals } from "@/lib/hooks/useSupabaseData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowLeft, Clock, History, FileCheck2, Share, ShieldCheck, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

export default function ApprovalDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const { activeWorkspace, user } = useAuthStore()
  const { slug } = useRequireWorkspace()
  const { data: approvals, loading } = useApprovals()
  const approval = approvals?.find((a: any) => a.id === id)

  if (!slug || loading) return <div className="p-8">Loading approval workflow...</div>
  if (!approval) return <div className="p-8">Approval not found.</div>

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push(`/workspace/${slug}/application-approvals`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      <PageHeader
        eyebrow="Application Approval"
        title={approval.client || approval.title}
        description={`ID: ${approval.id}`}
        action={<Badge variant="outline">{approval.status}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#111111]" /> Approval Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Visa type: {approval.type || 'Not specified'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
