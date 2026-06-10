import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildApprovalEmailHtml, resolveUserEmail, sendTransactionalEmail } from '@/lib/email/transactional';

const FREQUENCY_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (
    secret !== process.env.CRON_SECRET &&
    secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  let sent = 0;

  const { data: prefsRows } = await admin
    .from('user_notification_preferences')
    .select('*')
    .neq('email_digest_frequency', 'immediate')
    .eq('email_enabled', true);

  for (const prefs of prefsRows || []) {
    const freq = prefs.email_digest_frequency as string;
    const windowMs = FREQUENCY_MS[freq];
    if (!windowMs) continue;

    const last = prefs.last_digest_sent_at
      ? new Date(prefs.last_digest_sent_at).getTime()
      : 0;
    if (now - last < windowMs) continue;

    const since = last
      ? new Date(last).toISOString()
      : new Date(now - windowMs).toISOString();

    const { data: notes } = await admin
      .from('notifications')
      .select('title, message, action_url, created_at, priority')
      .eq('user_id', prefs.user_id)
      .eq('agency_id', prefs.agency_id)
      .gte('created_at', since)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!notes?.length) continue;

    const email = await resolveUserEmail(prefs.user_id);
    if (!email) continue;

    const itemsHtml = notes
      .map(
        (n) =>
          `<li style="margin-bottom:12px"><strong>${n.title}</strong><br/>${n.message}${
            n.action_url
              ? `<br/><a href="${process.env.NEXT_PUBLIC_APP_URL || ''}${n.action_url}">View</a>`
              : ''
          }</li>`,
      )
      .join('');

    const html = buildApprovalEmailHtml({
      title: `Your ${freq} notification digest`,
      body: `<p>${notes.length} notification(s) since your last digest:</p><ul>${itemsHtml}</ul>`,
      actionUrl: '/',
    });

    const result = await sendTransactionalEmail({
      to: email,
      subject: `ImmiMate — ${freq.charAt(0).toUpperCase() + freq.slice(1)} digest`,
      html,
      tags: [{ name: 'digest', value: freq }],
    });

    if (result.sent) {
      await admin
        .from('user_notification_preferences')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('user_id', prefs.user_id)
        .eq('agency_id', prefs.agency_id);
      sent += 1;
    }
  }

  return NextResponse.json({ success: true, digestsSent: sent });
}
