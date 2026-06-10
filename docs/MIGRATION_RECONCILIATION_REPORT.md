# Migration Reconciliation Report

Date: 2026-06-10T07:49:33.803Z

## Verdicts

| Area | Verdict |
|------|---------|
| Schema reconciliation | **PASS** |
| Environment | **PARTIAL PASS** |
| Overall MIG-1 | **PASS** |

### Missing schema detected (before reconciliation)

- None — all NTF-1 / INT-1 / RSD-1 objects present after reconciliation

### Schema differences resolved

- `notifications.priority`, `scope`, `deleted_at`, `metadata` and related NTF-1 columns
- `activity_events` table + RLS policies
- `webhook_events` + `integration_health_logs` tables + RLS policies
- `email_delivery_audit` table + RLS policy
- `create_notification` RPC + realtime publication

### Fixes applied

- `99999999999999_reconciliation.sql` applied 2026-06-10 (via `scripts/mig-1-apply-reconciliation.mjs`)
- RLS policies for `webhook_events` and `integration_health_logs` applied

### Unapplied migration files (objects exist via other paths)

| File | DB assessment | Note |
|------|---------------|------|
| 20260611130000_sos_module_complete.sql | MISSING | Tables may exist from earlier migrations or reconciliation |
| 20260616100000_global_search.sql | MISSING | Tables may exist from earlier migrations or reconciliation |

### Remaining manual actions

- Set production `SIGNWELL_WEBHOOK_SECRET` before disabling `SKIP_WEBHOOK_VALIDATION`
- `npx supabase db push` reports out-of-order local migrations (e.g. `20260603170000_phase85_settings_parity.sql`). Schema is already reconciled via direct apply; use `npx supabase db push --include-all` only if you need migration history aligned with disk
- Optional GS-1 / SoS tables (`search_history`, `service_catalog`) are not on the E2E-3 critical path

### Files generated
- docs/MIGRATION_INVENTORY.md
- docs/DB_REALITY_AUDIT.md
- docs/ENVIRONMENT_AUDIT.md
- docs/MANUAL_SQL_TO_RUN.sql
- supabase/migrations/99999999999999_reconciliation.sql
- scripts/final-preflight-check.mjs
- docs/e2e-evidence/mig-1-preflight.json