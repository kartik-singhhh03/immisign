import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildApprovalEmailHtml, resolveUserEmail, sendTransactionalEmail } from '@/lib/email/transactional';
import {
  createActivityEvent,
  payloadToActivityEvent,
} from './activity-events.service';
import {
  defaultPriorityForType,
  resolveWorkflowCategory,
} from './notification-query';
import {
  getUserNotificationPreferences,
  shouldSendEmail,
  shouldSendInApp,
} from './preferences';
import type { NotificationCategory, NotificationPayload } from './types';

function mapTypeToDb(type: NotificationCategory): string {
  if (type === 'comment' || type === 'checklist') return 'approval';
  if (type === 'task') return 'system';
  if (type === 'sos') return 'document';
  if (type === 'file_note') return 'comment';
  if (type === 'compliance') return 'system';
  return type;
}

function resolveEmailType(payload: NotificationPayload): string {
  const title = payload.title.toLowerCase();
  if (payload.type === 'agreement' || title.includes('agreement')) return 'agreement';
  if (payload.type === 'sos' || payload.workflowCategory === 'sos' || title.includes('statement of service')) {
    return 'sos';
  }
  if (
    payload.type === 'compliance' ||
    title.includes('matter complete') ||
    title.includes('marked complete')
  ) {
    return 'completion';
  }
  if (payload.type === 'approval' || payload.workflowCategory === 'approvals') {
    if (title.includes('lodge') || title.includes('lodged')) return 'approval_lodgement';
    return 'approval';
  }
  return payload.type;
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
    const priority = payload.priority ?? defaultPriorityForType(payload.type);
    const workflowCategory =
      payload.workflowCategory ?? resolveWorkflowCategory(payload.type);
    const metadata = {
      ...(payload.actions?.length ? { actions: payload.actions } : {}),
      ...(payload.clientId ? { client_id: payload.clientId } : {}),
      ...(payload.fileSource ? { file_source: payload.fileSource } : {}),
      ...(payload.fileId ? { file_id: payload.fileId } : {}),
    };

    if (shouldSendInApp(prefs, payload.type)) {
      const legacyRpcArgs = {
        p_agency_id: payload.agencyId,
        p_user_id: payload.userId,
        p_type: mapTypeToDb(payload.type),
        p_title: payload.title,
        p_message: payload.message,
        p_action_url: payload.actionUrl ?? null,
        p_entity_type: payload.entityType ?? null,
        p_entity_id: payload.entityId ?? null,
        p_actor_id: payload.actorId ?? null,
      };

      const ntf1RpcArgs = {
        ...legacyRpcArgs,
        p_priority: priority,
        p_scope: payload.scope ?? 'personal',
        p_assigned_to_user_id: payload.assignedToUserId ?? payload.userId,
        p_due_at: payload.dueAt ?? null,
        p_workflow_category: workflowCategory,
        p_metadata: metadata,
      };

      let { data: id, error } = await this.supabase.rpc('create_notification', ntf1RpcArgs);
      if (error) {
        ({ data: id, error } = await this.supabase.rpc('create_notification', legacyRpcArgs));
      }

      if (!error && id) {
        result.inAppId = id as string;
      } else {
        const admin = createAdminClient();
        const legacyRow = {
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
        };
        let { data: row } = await admin
          .from('notifications')
          .insert({
            ...legacyRow,
            priority,
            scope: payload.scope ?? 'personal',
            assigned_to_user_id: payload.assignedToUserId ?? payload.userId,
            due_at: payload.dueAt ?? null,
            workflow_category: workflowCategory,
            metadata,
          })
          .select('id')
          .single();
        if (!row) {
          ({ data: row } = await admin
            .from('notifications')
            .insert(legacyRow)
            .select('id')
            .single());
        }
        if (row) result.inAppId = row.id;
      }

      if (result.inAppId && !payload.skipActivityEvent) {
        await createActivityEvent(
          this.supabase,
          payloadToActivityEvent(payload, result.inAppId),
        );
      }
    }

    const sendImmediateEmail =
      shouldSendEmail(prefs, payload.type) &&
      (prefs.email_digest_frequency === 'immediate' || priority === 'critical');

    if (sendImmediateEmail) {
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
          emailType: resolveEmailType(payload),
          agencyId: payload.agencyId,
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
