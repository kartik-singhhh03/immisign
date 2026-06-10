import { getResendFromEmail, isLikelyProductionFromAddress } from '@/lib/email/resend';
import type { IntegrationHealthResult } from './types';
import { getLastHealthPings, logHealthCheck } from './health-logs';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ResendDiagnostics = {
  apiKeyPresent: boolean;
  apiKeyValid: boolean;
  fromEmail: string;
  domainVerified: boolean;
  domains: Array<{ name: string; status: string }>;
  lastEmailSent: string | null;
  lastEmailDelivered: string | null;
  lastEmailFailure: string | null;
  failedEmails24h: number;
  httpStatus: number | null;
  error: string | null;
};

export async function runResendDiagnostics(
  supabase: SupabaseClient,
): Promise<ResendDiagnostics> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = getResendFromEmail();
  const apiKeyPresent = Boolean(apiKey);

  let apiKeyValid = false;
  let domains: ResendDiagnostics['domains'] = [];
  let httpStatus: number | null = null;
  let error: string | null = null;

  if (apiKeyPresent) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      httpStatus = res.status;
      const json = await res.json().catch(() => ({}));
      apiKeyValid = res.ok;
      if (res.ok && Array.isArray(json?.data)) {
        domains = json.data.map((d: { name?: string; status?: string }) => ({
          name: d.name || '',
          status: d.status || 'unknown',
        }));
      } else if (!res.ok) {
        error = `HTTP ${res.status}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Request failed';
    }
  } else {
    error = 'RESEND_API_KEY missing';
  }

  const domainPart = fromEmail.split('@')[1] || '';
  const domainVerified = domains.some(
    (d) => d.name === domainPart && (d.status === 'verified' || d.status === 'active'),
  );
  const testModeFrom = fromEmail.endsWith('@resend.dev');

  let lastEmailSent: string | null = null;
  let lastEmailDelivered: string | null = null;
  let lastEmailFailure: string | null = null;
  let failedEmails24h = 0;
  try {
    const { data: sent } = await supabase
      .from('email_delivery_audit')
      .select('created_at')
      .in('status', ['accepted', 'sent', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastEmailSent = sent?.created_at ?? null;

    const { data: delivered } = await supabase
      .from('email_delivery_audit')
      .select('delivered_at')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastEmailDelivered = delivered?.delivered_at ?? null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: failed } = await supabase
      .from('email_delivery_audit')
      .select('created_at')
      .in('status', ['failed', 'bounced'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastEmailFailure = failed?.created_at ?? null;

    const { count } = await supabase
      .from('email_delivery_audit')
      .select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'bounced'])
      .gte('created_at', since);
    failedEmails24h = count ?? 0;
  } catch {
    // email_delivery_audit may not exist until migration applied
  }

  return {
    apiKeyPresent,
    apiKeyValid,
    fromEmail,
    domainVerified: domainVerified || testModeFrom,
    domains,
    lastEmailSent,
    lastEmailDelivered,
    lastEmailFailure,
    failedEmails24h,
    httpStatus,
    error,
  };
}

export async function checkResendHealth(
  supabase: SupabaseClient,
  agencyId?: string,
): Promise<IntegrationHealthResult> {
  const pings = await getLastHealthPings(supabase, 'resend');
  const diag = await runResendDiagnostics(supabase);

  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Resend API reachable';

  if (!diag.apiKeyPresent) {
    status = 'error';
    message = 'RESEND_API_KEY missing';
  } else if (!diag.apiKeyValid) {
    status = 'error';
    message = diag.error || 'Resend API key invalid';
  } else if (!diag.domainVerified) {
    status = 'warning';
    message = `FROM ${diag.fromEmail} — domain not verified; use onboarding@resend.dev for test`;
  }

  const now = new Date().toISOString();
  await logHealthCheck(supabase, 'resend', status, message, agencyId);

  return {
    integration: 'resend',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: {
      fromEmail: diag.fromEmail,
      domainVerified: diag.domainVerified,
      domainCount: diag.domains.length,
      lastEmailSent: diag.lastEmailSent,
      lastEmailDelivered: diag.lastEmailDelivered,
      lastEmailFailure: diag.lastEmailFailure,
      failedEmails24h: diag.failedEmails24h,
      testModeRecommended: !diag.domainVerified,
    },
  };
}
