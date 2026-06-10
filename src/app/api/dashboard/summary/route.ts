import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { TaskService } from '@/lib/tasks/task.service';

export const dynamic = 'force-dynamic';

const EMPTY_SUMMARY = {
  approvalWidgets: {
    awaitingReview: 0,
    awaitingApproval: 0,
    changesRequested: 0,
    readyToLodge: 0,
    recentlyApproved: 0,
    myAssignedReviews: 0,
    openChecklistItems: 0,
  },
  myTasks: [],
  myReviews: [],
  recentNotifications: [],
  recentActivity: [],
  upcomingDeadlines: [],
  overdueApprovals: [],
  pendingSignatures: [],
};

function isMissingTableError(message: string): boolean {
  return (
    message.includes('PGRST205') ||
    message.includes('agency_tasks') ||
    message.includes('does not exist') ||
    message.includes('Could not find the table')
  );
}

async function safeTasks(
  taskService: TaskService,
  agencyId: string,
  userId: string,
): Promise<unknown[]> {
  try {
    return await taskService.listForUser(agencyId, userId, { limit: 8 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingTableError(msg)) return [];
    throw e;
  }
}

export async function GET() {
  try {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return NextResponse.json(
        { success: false, error: ctx.error },
        { status: ctx.status },
      );
    }

    const approvalService = new ApprovalService(ctx.supabase);
    const taskService = new TaskService(ctx.supabase);

    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let widgets = EMPTY_SUMMARY.approvalWidgets;
    try {
      widgets = await approvalService.getWidgetCounts(
        ctx.agencyId,
        ctx.userId,
        ctx.dbRole,
      );
    } catch (e: unknown) {
      console.warn('dashboard/summary widgets:', e);
    }

    const [
      myTasks,
      myReviews,
      recentNotifications,
      recentActivity,
      upcomingDeadlines,
      overdueApprovals,
      pendingSignatures,
    ] = await Promise.all([
      safeTasks(taskService, ctx.agencyId, ctx.userId),
      ctx.supabase
        .from('application_approvals')
        .select('id, title, approval_number, status, lodgement_deadline')
        .eq('agency_id', ctx.agencyId)
        .eq('assigned_reviewer_id', ctx.userId)
        .in('status', ['submitted', 'under_review'])
        .is('deleted_at', null)
        .limit(8),
      ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.userId)
        .eq('agency_id', ctx.agencyId)
        .order('created_at', { ascending: false })
        .limit(8),
      ctx.supabase
        .from('activity_logs')
        .select('*')
        .eq('agency_id', ctx.agencyId)
        .order('created_at', { ascending: false })
        .limit(10),
      ctx.supabase
        .from('application_approvals')
        .select('id, title, approval_number, lodgement_deadline, status')
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .not('lodgement_deadline', 'is', null)
        .gte('lodgement_deadline', now.toISOString())
        .lte('lodgement_deadline', in7d)
        .not('status', 'eq', 'closed')
        .not('status', 'eq', 'rejected')
        .order('lodgement_deadline', { ascending: true })
        .limit(8),
      ctx.supabase
        .from('application_approvals')
        .select('id, title, approval_number, lodgement_deadline, status')
        .eq('agency_id', ctx.agencyId)
        .is('deleted_at', null)
        .lt('lodgement_deadline', now.toISOString())
        .not('status', 'eq', 'closed')
        .not('status', 'eq', 'rejected')
        .not('status', 'eq', 'lodged')
        .order('lodgement_deadline', { ascending: true })
        .limit(8),
      ctx.supabase
        .from('agreements')
        .select('id, title, status, clients(name)')
        .eq('agency_id', ctx.agencyId)
        .in('status', ['sent', 'awaiting_signature', 'pending'])
        .limit(8),
    ]);

    const queryError =
      myReviews.error ||
      recentNotifications.error ||
      recentActivity.error ||
      upcomingDeadlines.error ||
      overdueApprovals.error ||
      pendingSignatures.error;

    if (queryError) {
      console.warn('dashboard/summary query:', queryError.message);
      return NextResponse.json({
        success: true,
        summary: {
          ...EMPTY_SUMMARY,
          approvalWidgets: widgets,
          myTasks: myTasks || [],
        },
        warnings: [queryError.message],
      });
    }

    const { data: feeRows } = await ctx.supabase
      .from('agreements')
      .select('professional_fee')
      .eq('agency_id', ctx.agencyId)
      .is('deleted_at', null);
    const practiceRevenueTotal = (feeRows || []).reduce(
      (sum, row) => sum + (Number((row as { professional_fee?: number }).professional_fee) || 0),
      0,
    );

    return NextResponse.json({
      success: true,
      summary: {
        approvalWidgets: widgets,
        myTasks: myTasks || [],
        myReviews: myReviews.data || [],
        recentNotifications: recentNotifications.data || [],
        recentActivity: recentActivity.data || [],
        upcomingDeadlines: upcomingDeadlines.data || [],
        overdueApprovals: overdueApprovals.data || [],
        pendingSignatures: pendingSignatures.data || [],
        practiceRevenue: {
          total: practiceRevenueTotal,
          currency: 'AUD',
          hasData: practiceRevenueTotal > 0,
        },
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dashboard summary failed';
    console.error('GET /api/dashboard/summary', e);
    return NextResponse.json(
      { success: false, error: message, summary: EMPTY_SUMMARY },
      { status: 500 },
    );
  }
}
