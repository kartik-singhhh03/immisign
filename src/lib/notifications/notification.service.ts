import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildApprovalEmailHtml, resolveUserEmail, sendTransactionalEmail } from '@/lib/email/transactional';
import {
  getUserNotificationPreferences,
  shouldSendEmail,
  shouldSendInApp,
} from './preferences';
import type { NotificationCategory, NotificationPayload } from './types';

function mapTypeToDb(type: NotificationCategory): string {
  if (type === 'comment' || type === 'checklist') return 'approval';
  if (type === 'task') return 'system';
  return type;
}

export class NotificationService {
  constructor(private supabase: SupabaseClient) {}

  async notify(payload: NotificationPayload): Promise<{ inAppId?: string; emailSent?: boolean }> {
    const prefs = await getUserNotificationPreferences(
      this.supabase,
      payload.userId,
      payload.agencyId,
    );

    const result: { inAppId?: string; emailSent?: boolean } = {};

    if (shouldSendInApp(prefs, payload.type)) {
      const { data: id, error } = await this.supabase.rpc('create_notification', {
        p_agency_id: payload.agencyId,
        p_user_id: payload.userId,
        p_type: mapTypeToDb(payload.type),
        p_title: payload.title,
        p_message: payload.message,
        p_action_url: payload.actionUrl ?? null,
        p_entity_type: payload.entityType ?? null,
        p_entity_id: payload.entityId ?? null,
        p_actor_id: payload.actorId ?? null,
      });
      if (!error && id) result.inAppId = id as string;
      else if (error) {
        const admin = createAdminClient();
        const { data: row } = await admin
          .from('notifications')
          .insert({
            agency_id: payload.agencyId,
            user_id: payload.userId,
            type: mapTypeToDb(payload.type),
            title: payload.title,
            message: payload.message,
            action_url: payload.actionUrl ?? null,
            entity_type: payload.entityType ?? null,
            entity_id: payload.entityId ?? null,
            actor_id: payload.actorId ?? null,
            is_read: false,
          })
          .select('id')
          .single();
        if (row) result.inAppId = row.id;
      }
    }

    if (shouldSendEmail(prefs, payload.type)) {
      const email = await resolveUserEmail(payload.userId);
      if (email) {
        const subject = payload.emailSubject || payload.title;
        const html =
          payload.emailHtml ||
          buildApprovalEmailHtml({
            title: payload.title,
            body: payload.message,
            actionUrl: payload.actionUrl || '/',
          });
        const sent = await sendTransactionalEmail({
          to: email,
          subject,
          html,
          tags: [
            { name: 'category', value: payload.type },
            { name: 'agency_id', value: payload.agencyId },
          ],
        });
        result.emailSent = sent.sent;
      }
    }

    return result;
  }

  async notifyMany(
    userIds: string[],
    base: Omit<NotificationPayload, 'userId'>,
  ): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    await Promise.all(
      unique.map((userId) => this.notify({ ...base, userId })),
    );
  }
}

export function buildWorkspaceActionUrl(
  agencySlug: string,
  path: string,
): string {
  return `/workspace/${agencySlug}${path.startsWith('/') ? path : `/${path}`}`;
}
