import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationListParams = {
  userId: string;
  agencyId: string;
  page?: number;
  limit?: number;
  sidebar?: string;
  scope?: string;
  priority?: string;
  inbox?: string;
  includeArchived?: boolean;
  /** When false, only query columns from pre-NTF-1 schema */
  ntf1Ready?: boolean;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const LEGACY_TYPE_MAP: Record<string, string[]> = {
  agreements: ['agreement'],
  approvals: ['approval', 'comment', 'checklist', 'reminder'],
  sos: ['document'],
  file_notes: ['comment'],
  compliance: ['system'],
  system: ['system', 'task', 'billing'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyNotificationFilters(query: any, params: NotificationListParams) {
  const ntf1 = params.ntf1Ready !== false;

  let q = query.eq('agency_id', params.agencyId);

  if (ntf1) {
    q = q.is('deleted_at', null);
    if (params.sidebar === 'assigned') {
      q = q.eq('assigned_to_user_id', params.userId);
    } else {
      q = q.eq('user_id', params.userId);
    }
    if (!params.includeArchived) {
      q = q.is('archived_at', null);
    }
  } else {
    q = q.eq('user_id', params.userId);
  }

  if (params.sidebar === 'unread') {
    q = q.eq('is_read', false);
  }

  if (ntf1) {
    if (params.scope && params.scope !== 'all') {
      q = q.eq('scope', params.scope);
    }
    if (params.priority && params.priority !== 'all') {
      q = q.eq('priority', params.priority);
    }
    const cat = params.sidebar && LEGACY_TYPE_MAP[params.sidebar] ? params.sidebar : null;
    if (cat && cat !== 'assigned' && cat !== 'unread' && cat !== 'all') {
      q = q.eq('workflow_category', cat);
    }
  } else if (params.sidebar && LEGACY_TYPE_MAP[params.sidebar]) {
    q = q.in('type', LEGACY_TYPE_MAP[params.sidebar]);
  }

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  if (params.inbox === 'completed') {
    q = q.eq('is_read', true);
  } else if (ntf1) {
    if (params.inbox === 'overdue') {
      q = q.not('due_at', 'is', null).lt('due_at', todayStart).eq('is_read', false);
    } else if (params.inbox === 'today') {
      q = q.gte('due_at', todayStart).lte('due_at', todayEnd);
    } else if (params.inbox === 'upcoming') {
      q = q.gt('due_at', todayEnd).eq('is_read', false);
    }
  } else if (params.inbox === 'overdue' || params.inbox === 'today' || params.inbox === 'upcoming') {
    q = q.eq('is_read', false);
  }

  return q;
}

export function isMissingColumnError(message: string): boolean {
  return /does not exist/i.test(message) && /column/i.test(message);
}

export async function listNotifications(
  supabase: SupabaseClient,
  params: NotificationListParams & { offset: number; limit: number; type?: string | null },
) {
  const build = (ntf1Ready: boolean) => {
    let q = applyNotificationFilters(
      supabase.from('notifications').select('*', { count: 'exact' }),
      { ...params, ntf1Ready },
    )
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.type && params.type !== 'all') {
      q = q.eq('type', params.type);
    }
    return q;
  };

  let result = await build(false);
  if (!result.error) return result;

  result = await build(true);
  if (result.error && isMissingColumnError(result.error.message)) {
    result = await build(false);
  }
  return result;
}

export function resolveWorkflowCategory(type: string): string | null {
  switch (type) {
    case 'agreement':
      return 'agreements';
    case 'approval':
    case 'comment':
    case 'checklist':
    case 'reminder':
      return 'approvals';
    case 'document':
    case 'sos':
      return 'sos';
    case 'file_note':
      return 'file_notes';
    case 'compliance':
      return 'compliance';
    case 'team':
      return 'team';
    default:
      return 'system';
  }
}

export function defaultPriorityForType(type: string): string {
  switch (type) {
    case 'reminder':
      return 'critical';
    case 'approval':
    case 'comment':
    case 'checklist':
      return 'high';
    case 'system':
    case 'billing':
      return 'low';
    default:
      return 'normal';
  }
}
