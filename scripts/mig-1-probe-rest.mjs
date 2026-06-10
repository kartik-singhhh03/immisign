import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFromFiles } from './lib/resolve-database-url.mjs';

const env = loadEnvFromFiles();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  'clients', 'agreements', 'agreement_fee_items', 'application_approvals',
  'service_statements', 'file_notes', 'notifications', 'activity_events',
  'webhook_events', 'document_audit_events', 'email_delivery_audit',
  'matter_applicants', 'matter_financials', 'integration_health_logs',
  'user_notification_preferences', 'schema_migrations',
];

const COLUMN_PROBES = {
  notifications: ['priority', 'scope', 'deleted_at', 'metadata', 'assigned_to_user_id', 'due_at', 'archived_at', 'workflow_category'],
  user_notification_preferences: ['email_digest_frequency', 'last_digest_sent_at'],
};

const out = { tables: {}, columns: {} };

for (const table of TABLES) {
  const { error } = await admin.from(table).select('*', { count: 'exact', head: true });
  out.tables[table] = error
    ? { exists: false, error: error.message }
    : { exists: true };
}

for (const [table, cols] of Object.entries(COLUMN_PROBES)) {
  out.columns[table] = {};
  for (const col of cols) {
    const { error } = await admin.from(table).select(col).limit(1);
    out.columns[table][col] = error?.message?.includes('does not exist') ? false : true;
  }
}

fs.mkdirSync('docs/e2e-evidence', { recursive: true });
fs.writeFileSync('docs/e2e-evidence/mig-1-rest-probe.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
