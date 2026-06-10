import type { NotificationPriority, NotificationRecord } from '@/lib/notifications/types';

const VALID_PRIORITIES = new Set<NotificationPriority>(['critical', 'high', 'normal', 'low']);

export function normalizeNotification(row: Record<string, unknown>): NotificationRecord {
  const rawPriority = row.priority as string | undefined;
  const priority: NotificationPriority =
    rawPriority && VALID_PRIORITIES.has(rawPriority as NotificationPriority)
      ? (rawPriority as NotificationPriority)
      : 'normal';

  let metadata: NotificationRecord['metadata'] = {};
  if (row.metadata && typeof row.metadata === 'object') {
    metadata = row.metadata as NotificationRecord['metadata'];
  } else if (typeof row.metadata === 'string') {
    try {
      metadata = JSON.parse(row.metadata) as NotificationRecord['metadata'];
    } catch {
      metadata = {};
    }
  }

  return {
    id: String(row.id ?? ''),
    agency_id: String(row.agency_id ?? ''),
    user_id: String(row.user_id ?? ''),
    type: String(row.type ?? 'system'),
    title: String(row.title ?? 'Notification'),
    message: String(row.message ?? ''),
    is_read: Boolean(row.is_read),
    action_url: (row.action_url as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    actor_id: (row.actor_id as string | null) ?? null,
    priority,
    scope: (row.scope as NotificationRecord['scope']) || 'personal',
    assigned_to_user_id: (row.assigned_to_user_id as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    deleted_at: (row.deleted_at as string | null) ?? null,
    workflow_category: (row.workflow_category as NotificationRecord['workflow_category']) ?? null,
    metadata,
  };
}
