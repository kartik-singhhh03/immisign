import type { NotificationPriority, NotificationRecord } from '@/lib/notifications/types';

export const PRIORITY_STYLES: Record<
  NotificationPriority,
  { dot: string; label: string; ring: string }
> = {
  critical: { dot: 'bg-red-500', label: 'Critical', ring: 'ring-red-500/20' },
  high: { dot: 'bg-amber-500', label: 'High', ring: 'ring-amber-500/20' },
  normal: { dot: 'bg-[#111111]', label: 'Normal', ring: 'ring-[#111111]/10' },
  low: { dot: 'bg-[#9CA3AF]', label: 'Low', ring: 'ring-gray-300/40' },
};

export const SIDEBAR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'assigned', label: 'Assigned To Me' },
  { id: 'agreements', label: 'Agreements' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'sos', label: 'SOS' },
  { id: 'file_notes', label: 'File Notes' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'system', label: 'System' },
] as const;

export const SCOPE_FILTERS = [
  { id: 'all', label: 'All scopes' },
  { id: 'personal', label: 'My Notifications' },
  { id: 'team', label: 'Team Notifications' },
  { id: 'system', label: 'System Notifications' },
] as const;

export const INBOX_SECTIONS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
] as const;

export function getPriorityStyle(priority?: NotificationPriority | string | null) {
  if (priority && priority in PRIORITY_STYLES) {
    return PRIORITY_STYLES[priority as NotificationPriority];
  }
  return PRIORITY_STYLES.normal;
}

export function formatDueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  if (due < startToday) {
    const days = Math.ceil((startToday.getTime() - due.getTime()) / 86400000);
    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }
  if (due >= startToday && due <= endToday) return 'Due today';
  const days = Math.ceil((due.getTime() - endToday.getTime()) / 86400000);
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

export function getNotificationActions(n: NotificationRecord) {
  const meta = n.metadata?.actions;
  if (Array.isArray(meta) && meta.length) return meta;
  if (n.action_url) {
    return [{ id: 'open', label: 'Open', href: n.action_url, variant: 'primary' as const }];
  }
  return [];
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
