import type { SupabaseClient } from '@supabase/supabase-js';

export type SecurityEventType =
  | 'login.success'
  | 'login.failed'
  | 'logout'
  | 'password.change'
  | 'password.reset'
  | 'invite.created'
  | 'invite.sent'
  | 'invite.revoked'
  | 'invite.accepted'
  | 'role.change'
  | 'mfa.enabled'
  | 'mfa.disabled'
  | 'session.revoked'
  | 'session.revoked_all'
  | 'account.deletion_requested'
  | 'account.deleted';

function parseUserAgent(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown' };
  const browser = /Chrome/i.test(ua)
    ? 'Chrome'
    : /Firefox/i.test(ua)
      ? 'Firefox'
      : /Safari/i.test(ua)
        ? 'Safari'
        : /Edge/i.test(ua)
          ? 'Edge'
          : 'Browser';
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
  return { device, browser };
}

export async function logSecurityEvent(
  supabase: SupabaseClient,
  params: {
    agencyId?: string | null;
    userId?: string | null;
    eventType: SecurityEventType;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { device, browser } = parseUserAgent(params.userAgent ?? null);
  const { error } = await supabase.from('security_audit_logs').insert({
    agency_id: params.agencyId ?? null,
    user_id: params.userId ?? null,
    event_type: params.eventType,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    device_label: device,
    browser_label: browser,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error('[security_audit_logs]', params.eventType, error.message);
  }
}

export function getRequestMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  return { ip, userAgent: req.headers.get('user-agent') };
}
