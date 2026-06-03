# Migration Deployment Evidence (Phase 16.6A)

**Date:** 2026-06-03  
**Target database:** Supabase production (`wnohcmgmyhamsbmkiybc`)  
**Execution method:** `node scripts/run-pending-migrations.mjs`

---

## Migration applied

| Field | Value |
|-------|--------|
| **Filename** | `20260606100000_phase16_security_foundation.sql` |
| **Applied at** | `2026-06-03T20:35:39.165Z` (UTC) |
| **Recorded in** | `public.schema_migrations` |
| **Result** | **PASS** |

### Console evidence

```
APPLY 20260606100000_phase16_security_foundation.sql
OK 20260606100000_phase16_security_foundation.sql
MIGRATIONS_COMPLETE
```

Post-apply: `node scripts/phase14-reload-postgrest.mjs` — PostgREST schema reload notified.

---

## Verification queries (executed via `scripts/phase16-6-full-verification.mjs`)

### Tables exist

| Table | Columns | Result |
|-------|---------|--------|
| `security_audit_logs` | 10 columns | **PASS** |
| `service_statements` | 16 columns | **PASS** |
| `service_statement_items` | 10 columns | **PASS** |

### `users` MFA / deletion columns

| Column | Present |
|--------|---------|
| `mfa_enabled` | Yes (base schema) |
| `mfa_enrolled_at` | Yes (phase 16 migration) |
| `mfa_recovery_codes` | Yes (phase 16 migration) |
| `deleted_at` | Yes (base schema) |

**Result:** **PASS**

### Indexes (`security_audit_logs`)

- `security_audit_logs_pkey`
- `idx_security_audit_logs_agency_created`
- `idx_security_audit_logs_user_created`

### Foreign keys (sample)

| Child table | FK to |
|-------------|--------|
| `security_audit_logs` | `agencies`, `users` |
| `service_statements` | `agencies`, `clients`, `agreements`, `application_approvals`, `matter_types`, `users` |
| `service_statement_items` | `agencies`, `service_statements` |

### RLS policies

| Table | Policies |
|-------|----------|
| `security_audit_logs` | `security_audit_logs_select_agency` (SELECT), `security_audit_logs_insert_own` (INSERT) |
| `service_statements` | `service_statements_tenant` (ALL) |
| `service_statement_items` | `service_statement_items_tenant` (ALL) |

**RLS structural verification:** **PASS**  
**JWT cross-tenant probe:** **PARTIAL** (policies present; live JWT denial not scripted)

---

## Machine-readable report

- `docs/verification-screenshots/phase16-6/phase16-6-verification-local.json` — `migration` + `database` sections

---

## Screenshots

Database console screenshots are optional when SQL evidence is captured in JSON. For Supabase Dashboard: Table Editor → confirm `security_audit_logs`, `service_statements`, `service_statement_items` visible after refresh.

---

## Phase 16.6A verdict: **PASS** (database migration deployed and verified)
