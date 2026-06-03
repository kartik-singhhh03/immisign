# Phase 11.3 — Database Repair Report

**Date:** 2026-06-03  
**Project:** `wnohcmgmyhamsbmkiybc.supabase.co`  
**Status:** **PASS**  
**Phase 12:** Not started

---

## Summary

Remote Supabase schema is now aligned with the ImmiSign codebase. The migration verifier (`node scripts/phase11-2-migration-verify.mjs`) exits **0** with all required columns present.

| Step | Result |
|------|--------|
| 1. `SUPABASE_DB_PASSWORD` configured | **PASS** |
| 2. Postgres connection | **PASS** via `db.wnohcmgmyhamsbmkiybc.supabase.co:5432` (direct host) |
| 3. `schema_migrations` tracker bootstrapped | **PASS** (22 rows recorded) |
| 4. `20260603180000_phase11_2_schema_repair.sql` applied | **PASS** |
| 5. Migration verifier | **PASS** (exit code 0) |

---

## Connection notes

- **Pooler** (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) returned `tenant/user postgres.wnohcmgmyhamsbmkiybc not found` for this project.
- **Direct** connection succeeded: `postgresql://postgres:***@db.wnohcmgmyhamsbmkiybc.supabase.co:5432/postgres`
- Scripts now try direct host first (`scripts/lib/resolve-database-url.mjs`).

---

## Migration strategy

The remote database was already provisioned (tables existed) but lacked:

- Custom `schema_migrations` history
- Phase 10–11.1 column additions

**Approach:**

1. Created `public.schema_migrations` if missing.
2. **Bootstrapped** 21 existing migration filenames as “already applied” (avoids re-running `00000000000000_base_schema.sql`, which would fail with “type user_role already exists”).
3. **Applied** `20260603180000_phase11_2_schema_repair.sql` (idempotent `ADD COLUMN IF NOT EXISTS` + RLS + `send_document_drafts`).

Earlier files (`20260603100000_immisign_single_plan_billing.sql`, `20260603150000_auto_agent_signatures.sql`, `20260603170000_phase11_1_hardening.sql`) were marked applied during bootstrap; their DDL is covered by the repair migration.

---

## Success criteria verification

| Column | Status |
|--------|--------|
| `agreements.agent_signed_at` | **PASS** |
| `agreements.agent_signature_url` | **PASS** |
| `documents.signwell_document_id` | **PASS** |
| `documents.signwell_status` | **PASS** |
| `rmas.signature_mode` | **PASS** |
| `subscriptions.included_seats` | **PASS** |
| `subscriptions.billable_seats` | **PASS** |
| `subscriptions.additional_seats` | **PASS** |
| `subscriptions.stripe_seat_item_id` | **PASS** |

Additional columns verified: `agreements.agent_signer_user_id`, `documents.sender_*`, `rmas.signature_text`, `subscriptions.stripe_subscription_id`.

---

## Tables verified

| Table | Status |
|-------|--------|
| `agreement_wizard_drafts` | Present |
| `send_document_drafts` | Present |
| `matter_type_fields` | Present (42 rows) |
| `application_approvals` | Present |
| `approval_comments` | Present |
| `branding_settings` | Present |
| `schema_migrations` | Present (22 applied filenames) |

---

## Commands used

```bash
node scripts/phase11-3-apply-repair-only.mjs
node scripts/phase11-2-migration-verify.mjs
```

Wrapper (delegates to repair-only flow):

```bash
node scripts/phase11-3-database-repair.mjs
```

---

## Code changes in this phase

| File | Purpose |
|------|---------|
| `scripts/lib/resolve-database-url.mjs` | Direct DB host + pooler fallbacks |
| `scripts/phase11-3-apply-repair-only.mjs` | Bootstrap + repair apply + verify |
| `scripts/phase11-3-database-repair.mjs` | Entry point |
| `scripts/phase11-2-migration-verify.mjs` | Uses direct connection for PG audit |
| `scripts/run-pending-migrations.mjs` | Uses shared URL resolver |

---

## Security reminder

Database credentials were added to `.env.local`. Ensure `.env.local` is gitignored and never committed. If the password was shared in chat or logs, **rotate it** in Supabase Dashboard → Database → Reset password, then update `.env.local`.

---

## Next steps (Phase 11.2 continuation)

Schema repair unblocks:

- Agreement send + auto agent signatures
- Send Document SignWell linkage
- Stripe seat columns on `subscriptions`

Re-run production smoke tests from `docs/PRODUCTION_READINESS_REPORT.md` and update launch score.

**Phase 12 gate:** Schema repair **PASS**. E2E smoke tests and Stripe key alignment still required before Application Approvals module work.
