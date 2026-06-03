import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';

const STAGES = [
  { key: '7d', days: 7, title: 'Due in 7 days' },
  { key: '3d', days: 3, title: 'Due in 3 days' },
  { key: '1d', days: 1, title: 'Due tomorrow' },
  { key: 'overdue', days: 0, title: 'Overdue' },
] as const;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET && secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: approvals } = await admin
    .from('application_approvals')
    .select('id, agency_id, title, approval_number, lodgement_deadline, reminders_sent, created_by, assigned_reviewer_id, status')
    .is('deleted_at', null)
    .not('lodgement_deadline', 'is', null)
    .not('status', 'in', '("closed","rejected")');

  const { data: agencies } = await admin.from('agencies').select('id, slug');
  const slugMap = Object.fromEntries((agencies || []).map((a) => [a.id, a.slug]));

  const notifications = new NotificationService(admin);
  let sent = 0;

  for (const row of approvals || []) {
    const due = new Date(row.lodgement_deadline);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const sentFlags = (row.reminders_sent as Record<string, boolean>) || {};
    const slug = slugMap[row.agency_id] || 'workspace';

    for (const stage of STAGES) {
      if (sentFlags[stage.key]) continue;
      const match =
        (stage.key === 'overdue' && diffDays < 0) ||
        (stage.key !== 'overdue' && diffDays === stage.days);
      if (!match) continue;

      const recipients = [...new Set([row.created_by, row.assigned_reviewer_id].filter(Boolean))] as string[];
      for (const userId of recipients) {
        await notifications.notify({
          agencyId: row.agency_id,
          userId,
          type: 'reminder',
          title: stage.title,
          message: `${row.approval_number || row.title} — due ${due.toLocaleDateString()}`,
          actionUrl: buildWorkspaceActionUrl(slug, `/approvals/${row.id}`),
          entityType: 'application_approval',
          entityId: row.id,
        });
        sent++;
      }

      await admin
        .from('application_approvals')
        .update({
          reminders_sent: { ...sentFlags, [stage.key]: true },
        })
        .eq('id', row.id);
    }
  }

  return NextResponse.json({ success: true, notificationsSent: sent });
}
