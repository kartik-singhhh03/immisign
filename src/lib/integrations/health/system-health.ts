import { createAdminClient } from '@/lib/supabase/admin';
import { detectAppUrlMismatch } from '@/lib/env';
import type { IntegrationHealthResult, ProductionReadinessResult } from './types';
import { checkSignwellHealth } from './signwell-diagnostics';
import { checkResendHealth } from './resend-diagnostics';
import { getLastHealthPings, logHealthCheck } from './health-logs';

function scoreForStatus(status: IntegrationHealthResult['status'], weight: number): number {
  if (status === 'healthy') return weight;
  if (status === 'warning') return Math.round(weight * 0.5);
  return 0;
}

async function checkSupabaseHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'supabase');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Supabase REST reachable';

  const { count, error } = await admin.from('agencies').select('*', { count: 'exact', head: true });
  if (error) {
    status = 'error';
    message = error.message;
  }

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'supabase', status, message, agencyId);

  return {
    integration: 'supabase',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: { agencyCount: count ?? 0 },
  };
}

async function checkStorageHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'storage');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Storage buckets accessible';

  let bucketCount = 0;
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    status = 'error';
    message = error.message;
  } else {
    bucketCount = buckets?.length ?? 0;
    const required = ['secure_documents', 'signatures'];
    const names = (buckets || []).map((b) => b.name);
    const missing = required.filter((r) => !names.includes(r));
    if (missing.length) {
      status = 'warning';
      message = `Missing buckets: ${missing.join(', ')}`;
    }
  }

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'storage', status, message, agencyId);

  return {
    integration: 'storage',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: { bucketCount },
  };
}

async function checkNotificationsHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'notifications');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Notification schema OK';

  const checks: Record<string, boolean> = {};

  const { error: priErr } = await admin.from('notifications').select('priority').limit(1);
  checks.priority = !priErr?.message?.includes('does not exist');
  const { error: scopeErr } = await admin.from('notifications').select('scope').limit(1);
  checks.scope = !scopeErr?.message?.includes('does not exist');
  const { error: delErr } = await admin.from('notifications').select('deleted_at').limit(1);
  checks.deleted_at = !delErr?.message?.includes('does not exist');
  const { error: actErr } = await admin.from('activity_events').select('id').limit(1);
  checks.activity_events = !actErr?.message?.includes('does not exist');

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    status = 'error';
    message = `NTF-1 migration required: missing ${missing.join(', ')}`;
  }

  const { count } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'notifications', status, message, agencyId);

  return {
    integration: 'notifications',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: {
      schema: checks,
      notificationCount: count ?? 0,
      cronSecretPresent: Boolean(process.env.CRON_SECRET?.trim()),
    },
  };
}

async function checkWebhooksHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'webhooks');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Webhook tracking active';

  let tableExists = true;
  let recentEvents: unknown[] = [];
  try {
    const { data, error } = await admin
      .from('webhook_events')
      .select('provider, event_type, status, received_at')
      .order('received_at', { ascending: false })
      .limit(5);
    if (error?.message?.includes('does not exist')) {
      tableExists = false;
      status = 'warning';
      message = 'webhook_events table missing — apply INT-1 migration';
    } else {
      recentEvents = data || [];
    }
  } catch {
    tableExists = false;
    status = 'warning';
    message = 'webhook_events table not available';
  }

  const { count: processedCount } = await admin
    .from('processed_webhooks')
    .select('*', { count: 'exact', head: true });

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'webhooks', status, message, agencyId);

  return {
    integration: 'webhooks',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: {
      tableExists,
      processedWebhookCount: processedCount ?? 0,
      recentEvents,
      signwellWebhookId: Boolean(process.env.SIGNWELL_WEBHOOK_ID?.trim()),
      resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
    },
  };
}

async function checkSearchHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'search');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Search RPC available';

  const { error } = await admin.rpc('global_search', {
    p_agency_id: agencyId,
    p_query: 'test',
    p_limit: 1,
  });

  if (error?.message?.includes('does not exist') || error?.code === '42883') {
    status = 'warning';
    message = 'global_search RPC not found';
  } else if (error) {
    status = 'warning';
    message = error.message;
  }

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'search', status, message, agencyId);

  return {
    integration: 'search',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: {},
  };
}

async function checkDocumentsHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'documents');
  let status: IntegrationHealthResult['status'] = 'healthy';
  let message = 'Document storage OK';

  const { count, error } = await admin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  if (error) {
    status = 'error';
    message = error.message;
  }

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'documents', status, message, agencyId);

  return {
    integration: 'documents',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: { documentCount: count ?? 0 },
  };
}

async function checkCronHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'cron');
  const cronSecret = process.env.CRON_SECRET?.trim();
  let status: IntegrationHealthResult['status'] = cronSecret ? 'healthy' : 'warning';
  let message = cronSecret ? 'CRON_SECRET configured' : 'CRON_SECRET missing — digest cron unsecured';

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'cron', status, message, agencyId);

  return {
    integration: 'cron',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: { cronSecretPresent: Boolean(cronSecret) },
  };
}

async function checkAppUrlHealth(agencyId: string): Promise<IntegrationHealthResult> {
  const admin = createAdminClient();
  const pings = await getLastHealthPings(admin, 'app_url');
  const mismatch = detectAppUrlMismatch();
  let status: IntegrationHealthResult['status'] = mismatch ? 'warning' : 'healthy';
  let message = mismatch
    ? `NEXT_PUBLIC_APP_URL (${mismatch.configured}) does not match server (${mismatch.detected})`
    : 'App URL aligned';

  const now = new Date().toISOString();
  await logHealthCheck(admin, 'app_url', status, message, agencyId);

  return {
    integration: 'environment',
    status,
    message,
    lastSuccessAt: status === 'healthy' ? now : pings.lastSuccessAt,
    lastFailureAt: status !== 'healthy' ? now : pings.lastFailureAt,
    details: mismatch || { configured: process.env.NEXT_PUBLIC_APP_URL, aligned: true },
  };
}

const WEIGHTS: Record<string, number> = {
  supabase: 15,
  storage: 10,
  resend: 15,
  signwell: 20,
  notifications: 15,
  search: 10,
  documents: 5,
  webhooks: 10,
};

export async function runFullSystemHealth(agencyId: string): Promise<{
  checks: IntegrationHealthResult[];
  readiness: ProductionReadinessResult;
  appUrlMismatch: ReturnType<typeof detectAppUrlMismatch>;
}> {
  const admin = createAdminClient();

  const checks = await Promise.all([
    checkSupabaseHealth(agencyId),
    checkStorageHealth(agencyId),
    checkResendHealth(admin, agencyId),
    checkSignwellHealth(admin, agencyId),
    checkNotificationsHealth(agencyId),
    checkWebhooksHealth(agencyId),
    checkSearchHealth(agencyId),
    checkDocumentsHealth(agencyId),
    checkCronHealth(agencyId),
    checkAppUrlHealth(agencyId),
  ]);

  const scored = checks.filter((c) => WEIGHTS[c.integration] != null);
  const maxScore = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const score = scored.reduce((sum, c) => sum + scoreForStatus(c.status, WEIGHTS[c.integration] || 0), 0);
  const percentage = Math.round((score / maxScore) * 100);

  return {
    checks,
    readiness: { score, maxScore, percentage, checks: scored },
    appUrlMismatch: detectAppUrlMismatch(),
  };
}
