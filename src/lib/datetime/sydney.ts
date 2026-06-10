const SYDNEY_TZ = 'Australia/Sydney';

/** Display timestamps in Australia/Sydney. DB must store UTC ISO strings. */
export function formatSydneyDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not Provided';
  return d.toLocaleString('en-AU', {
    timeZone: SYDNEY_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export function formatSydneyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not Provided';
  return d.toLocaleDateString('en-AU', {
    timeZone: SYDNEY_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Verify DB value is UTC (ends with Z or +00:00 offset). */
export function isUtcIsoString(value: string): boolean {
  return /Z$/.test(value) || /\+00:00$/.test(value);
}
