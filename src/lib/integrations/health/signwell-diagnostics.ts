import { getSignwellWebhookVerificationKey } from '@/lib/signwell/webhooks';
import type { IntegrationHealthResult } from './types';
import { getLastHealthPings, logHealthCheck } from './health-logs';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SignwellDiagnostics = {
  apiKeyPresent: boolean;
  apiKeyValid: boolean;
  webhookIdPresent: boolean;
  webhookSecretPresent: boolean;
  webhookConfigured: boolean;
  account: Record<string, unknown> | null;
  hooks: Array<{ id: string; callback_url?: string }>;
  quota: Record<string, unknown> | null;
  httpStatus: number | null;
  error: string | null;
};

async function signwellFetch(path: string): Promise<{ ok: boolean; status: number; json: unknown; error: string | null }> {
  const apiKey = process.env.SIGNWELL_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, status: 0, json: null, error: 'SIGNWELL_API_KEY missing' };
  }
  const base = (process.env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    return {
      ok: res.ok,
      status: res.status,
      json,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: e instanceof Error ? e.message : 'Request failed' };
  }
}

export async function runSignwellDiagnostics(): Promise<SignwellDiagnostics> {
  const apiKeyPresent = Boolean(process.env.SIGNWELL_API_KEY?.trim());
  const webhookIdPresent = Boolean(process.env.SIGNWELL_WEBHOOK_ID?.trim());
  const webhookSecretPresent = Boolean(process.env.SIGNWELL_WEBHOOK_SECRET?.trim());
  const verificationKey = getSignwellWebhookVerificationKey();

  const hooksRes = await signwellFetch('/hooks');
  const meRes = await signwellFetch('/me');

  const hooksRaw = hooksRes.json as { data?: unknown[] } | unknown[] | null;
  const hooksList = Array.isArray(hooksRaw)
    ? hooksRaw
    : Array.isArray((hooksRaw as { data?: unknown[] })?.data)
      ? (hooksRaw as { data: unknown[] }).data
      : [];

  const hooks = hooksList.map((h: unknown) => {
    const row = h as { id?: string; callback_url?: string };
    return { id: row.id || '', callback_url: row.callback_url };
  }).filter((h) => h.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const expectedCallback = `${appUrl}/api/webhooks/signwell`;
  const webhookConfigured = hooks.some((h) =>
    h.callback_url?.includes('/api/webhooks/signwell') ||
    h.callback_url === expectedCallback,
  );

  return {
    apiKeyPresent,
    apiKeyValid: hooksRes.ok || meRes.ok,
    webhookIdPresent: webhookIdPresent || Boolean(verificationKey),
    webhookSecretPresent,
    webhookConfigured,
    account: meRes.ok ? (meRes.json as Record<string, unknown>) : null,
    hooks,
    quota: meRes.ok ? (meRes.json as Record<string, unknown>) : null,
    httpStatus: hooksRes.status || meRes.status,
    error: hooksRes.ok || meRes.ok ? null : (hooksRes.error || meRes.error),
  };
}

export async function checkSignwellHealth(
  supabase: SupabaseClient,
  agencyId?: string,
): Promise<IntegrationHealthResult> {
  const pings = await getLastHealthPings(supabase, 'signwell');
  const diag = await runSignwellDiagnostics();

  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'SignWell API reachable';

  if (!diag.apiKeyPresent) {
    status = 'error';
    message = 'SIGNWELL_API_KEY missing';
  } else if (!diag.apiKeyValid) {
    status = 'error';
    message = diag.error || 'SignWell API key invalid (check X-Api-Key)';
  } else if (!diag.webhookIdPresent) {
    status = 'warning';
    message = 'SIGNWELL_WEBHOOK_ID missing — webhooks cannot be verified';
  } else if (!diag.webhookConfigured) {
    status = 'warning';
    message = 'No webhook subscription pointing to /api/webhooks/signwell';
  }

  const now = new Date().toISOString();
  await logHealthCheck(supabase, 'signwell', status, message, agencyId);

  return {
    integration: 'signwell',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: {
      apiKeyPresent: diag.apiKeyPresent,
      apiKeyValid: diag.apiKeyValid,
      webhookIdPresent: diag.webhookIdPresent,
      webhookSecretPresent: diag.webhookSecretPresent,
      webhookConfigured: diag.webhookConfigured,
      hookCount: diag.hooks.length,
      httpStatus: diag.httpStatus,
    },
  };
}
