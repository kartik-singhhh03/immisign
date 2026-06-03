# Phase 15 — Database Audit

**Date:** 2026-06-03  
**Script:** `scripts/phase15-database-audit.mjs`  
**Evidence:** `docs/verification-screenshots/phase15-database-audit.json`

---

## Migrations

| Check | Result |
|-------|--------|
| Local migration files | **24** |
| Applied in `schema_migrations` | **24** |
| Missing | **0** |

**PASS** — All migrations applied remotely.

---

## Core tables

| Table | Exists |
|-------|--------|
| agencies | Yes |
| users | Yes |
| clients | Yes |
| agreements | Yes |
| documents | Yes |
| application_approvals | Yes |
| notifications | Yes |
| agency_tasks | Yes |
| user_notification_preferences | Yes |
| activity_logs | Yes |
| subscriptions | Yes |

---

## RLS

| Check | Result |
|-------|--------|
| RLS disabled on core tenant tables | **None** |

Tenant policies use `public.get_tenant()` (see `20260529000000_tenant_rls_policies.sql` and Phase 12/13 migrations).

---

## Data integrity

| Orphan check | Count |
|--------------|-------|
| users_without_agency | 0 |
| clients_orphan_agency | 0 |
| agreements_orphan_agency | 0 |

---

## Indexes (sample)

| Table | Index count |
|-------|-------------|
| application_approvals | 5 |
| agreements | 5 |
| notifications | 3 |
| agency_tasks | 3 |
| subscriptions | 6 |

---

## Foreign keys

Phase 15 audit confirms no orphan rows on `clients` and `agreements` → FK relationships intact for sampled entities.

---

## Operational commands

```bash
node scripts/phase15-database-audit.mjs
node scripts/phase14-verify-phase13-tables.mjs
node scripts/phase14-reload-postgrest.mjs   # after schema changes
```

---

## Result

**PASS** — Database is migration-complete, RLS-enabled, and free of sampled orphan data.
