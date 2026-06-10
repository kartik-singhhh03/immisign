import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import type { NotificationCategory } from '@/lib/notifications/types';

export async function logApprovalActivity(
  supabase: SupabaseClient,
  params: {
    agency_id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    approval_id: string;
  },
): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    agency_id: params.agency_id,
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    description: params.description ?? null,
    reference_id: params.approval_id,
    reference_type: 'application_approval',
  });
  if (error) console.warn('Approval activity log:', error.message);
}

/** @deprecated Use notifyApprovalUser */
export async function createApprovalNotification(
  supabase: SupabaseClient,
  params: {
    agency_id: string;
    user_id: string;
    title: string;
    message: string;
    action_url?: string;
  },
): Promise<void> {
  await notifyApprovalUser(supabase, {
    agencyId: params.agency_id,
    userId: params.user_id,
    title: params.title,
    message: params.message,
    actionUrl: params.action_url,
    category: 'approval',
  });
}

export async function notifyApprovalUser(
  supabase: SupabaseClient,
  params: {
    agencyId: string;
    agencySlug?: string;
    userId: string;
    title: string;
    message: string;
    actionUrl?: string;
    approvalId?: string;
    actorId?: string;
    category?: NotificationCategory;
    emailSubject?: string;
  },
): Promise<void> {
  let actionUrl = params.actionUrl;
  if (params.agencySlug && params.approvalId && !actionUrl?.includes('/approvals/')) {
    actionUrl = buildWorkspaceActionUrl(
      params.agencySlug,
      `/approvals/${params.approvalId}`,
    );
  }

  const svc = new NotificationService(supabase);
  await svc.notify({
    agencyId: params.agencyId,
    userId: params.userId,
    type: params.category || 'approval',
    title: params.title,
    message: params.message,
    actionUrl,
    entityType: 'application_approval',
    entityId: params.approvalId,
    actorId: params.actorId,
    emailSubject: params.emailSubject || params.title,
    priority: 'high',
    workflowCategory: 'approvals',
    actions: actionUrl
      ? [{ id: 'review', label: 'Review Approval', href: actionUrl, variant: 'primary' }]
      : undefined,
  });
}

export async function logCertificateGenerated(
  supabase: SupabaseClient,
  params: {
    agency_id: string;
    user_id: string;
    approval_id: string;
    approval_number?: string | null;
    title: string;
    agencySlug?: string;
  },
): Promise<void> {
  const label = params.approval_number || params.title;
  await logApprovalActivity(supabase, {
    agency_id: params.agency_id,
    user_id: params.user_id,
    type: 'approval.certificate_generated',
    title: 'Certificate of Approval generated',
    description: label,
    approval_id: params.approval_id,
  });
  await notifyApprovalUser(supabase, {
    agencyId: params.agency_id,
    agencySlug: params.agencySlug,
    userId: params.user_id,
    title: 'Certificate of Approval generated',
    message: `Certificate ready for ${label}.`,
    approvalId: params.approval_id,
    category: 'approval',
  });
}

export async function logApprovalCompleted(
  supabase: SupabaseClient,
  params: {
    agency_id: string;
    user_id: string;
    approval_id: string;
    approval_number?: string | null;
    title: string;
    agencySlug?: string;
    via: 'signwell' | 'portal';
  },
): Promise<void> {
  const label = params.approval_number || params.title;
  await logApprovalActivity(supabase, {
    agency_id: params.agency_id,
    user_id: params.user_id,
    type: 'approval.completed',
    title: 'Application approval completed',
    description: label,
    approval_id: params.approval_id,
  });
  await notifyApprovalUser(supabase, {
    agencyId: params.agency_id,
    agencySlug: params.agencySlug,
    userId: params.user_id,
    title: 'Application approval completed',
    message: `${label} is signed and ready for lodgement.`,
    approvalId: params.approval_id,
    category: 'approval',
  });
}
