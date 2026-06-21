#!/usr/bin/env node
/**
 * Probe production schema via Supabase service role when direct Postgres is unavailable.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[line.slice(0, i).trim()] = v;
    }
  }
  return env;
}

const FOCUS = [
  {
    version: '20260620130000_application_approval_rebuild',
    file: '20260620130000_application_approval_rebuild.sql',
    probe: async (admin) => {
      const { error } = await admin.from('application_approvals').select('approval_token, matter_id, application_file_path').limit(1);
      return !error;
    },
    label: 'application_approval_rebuild columns',
  },
  {
    version: '20260616100000_application_approval_enhancements',
    file: '20260616100000_application_approval_enhancements.sql',
    probe: async (admin) => {
      const { error } = await admin.from('application_approvals').select('approval_record_storage_path').limit(1);
      return !error;
    },
    label: 'approval_record_storage_path column',
  },
  {
    version: '20260622100000_agreement_rebuild_v2',
    file: '20260622100000_agreement_rebuild_v2.sql',
    probe: async (admin) => {
      const { data: types } = await admin.from('matter_types').select('name').eq('name', 'Visa Application').limit(1);
      const { count } = await admin.from('agreement_clauses').select('*', { count: 'exact', head: true });
      return (types?.length ?? 0) > 0 && (count ?? 0) > 0;
    },
    label: 'AVC matter types + agreement_clauses seeded',
  },
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('MISSING_SUPABASE_ENV');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const results = [];

  for (const m of FOCUS) {
    let applied = false;
    let error = null;
    try {
      applied = await m.probe(admin);
    } catch (e) {
      error = e.message;
    }
    results.push({ ...m, applied, error });
  }

  const report = {
    timestamp: new Date().toISOString(),
    method: 'supabase_schema_probe',
    note: 'Direct Postgres (schema_migrations) unavailable — inferred from schema probes',
    focus: results,
    allApplied: results.every((r) => r.applied),
  };

  console.log(JSON.stringify(report, null, 2));
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(
    'docs/MIGRATION_PROBE_RESULT.json',
    JSON.stringify(report, null, 2),
  );
  process.exit(report.allApplied ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
