import type { NoteTypeRecord } from '../types';

export function formatNoteTypeLabel(
  type: string,
  isSystem: boolean,
  catalog?: NoteTypeRecord[],
): string {
  if (isSystem) {
    return catalog?.find((t) => t.code === 'system')?.label || 'System';
  }
  return catalog?.find((t) => t.code === type)?.label || type;
}

const SYDNEY_TZ = 'Australia/Sydney';

export function formatExactTimestamp(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleString('en-AU', {
    timeZone: SYDNEY_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timePart = d
    .toLocaleString('en-AU', {
      timeZone: SYDNEY_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
  return `${datePart} at ${timePart}`;
}

export function formatRelativeTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return 'Just now';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  if (date >= startOfToday) {
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    return `${diffHrs}h ago`;
  }

  if (date >= startOfYesterday) {
    const timePart = date
      .toLocaleString('en-AU', {
        timeZone: SYDNEY_TZ,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();
    return `Yesterday · ${timePart}`;
  }

  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatExactTimestamp(iso);
}

export function formatTimelineTimestamp(iso: string): string {
  const absolute = formatExactTimestamp(iso);
  const relative = formatRelativeTimestamp(iso);
  if (relative === formatExactTimestamp(iso)) return absolute;
  return `${absolute} · ${relative}`;
}
