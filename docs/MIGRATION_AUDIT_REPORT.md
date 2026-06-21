# Migration Audit Report

**Generated:** 2026-06-21  
**Status:** **PASS (schema probes)** — all three focus migrations verified on production Supabase

---

## Methods used

| Method | Result |
|--------|--------|
| `node scripts/migration-audit.mjs` | **SKIPPED** — `MISSING_DATABASE_CREDENTIALS` (no `DATABASE_URL` / `SUPABASE_DB_PASSWORD` in `.env.local`) |
| `npx supabase migration list --linked` | **SKIPPED** — Supabase CLI binary unavailable on win32-x64 in this environment |
| `node scripts/migration-probe-supabase.mjs` | **PASS** — schema probes via service role |
| `node scripts/apply-agreement-rebuild-v2-supabase.mjs` | **EXECUTED** — pending migration applied |

---

## Focus migrations

| Migration file | Schema probe | Applied? |
|----------------|--------------|----------|
| `20260620130000_application_approval_rebuild.sql` | `application_approvals.approval_token`, `matter_id`, `application_file_path` | **YES** |
| `20260616100000_application_approval_enhancements.sql` | `application_approvals.approval_record_storage_path` | **YES** |
| `20260622100000_agreement_rebuild_v2.sql` | `matter_types.name = 'Visa Application'` + `agreement_clauses` count > 0 | **YES** (after apply script) |

---

## Apply actions taken

**20260622100000_agreement_rebuild_v2** was pending before this release run.

Applied via `scripts/apply-agreement-rebuild-v2-supabase.mjs` for agencies:

- avc-migration-live
- kartik-labs
- anshu-labs
- avc-visa
- ritiklabs
- abc-lab

Effects:

- Legacy visa-stream matter types archived
- AVC matter types inserted (Visa Application, ART Appeal, Skill Assessment, PSA, JRP)
- Standard agreement clauses seeded where agency had none

---

## Evidence

- Probe output: `docs/MIGRATION_PROBE_RESULT.json`
- Final probe exit code: **0** (`allApplied: true`)

---

## Note

`supabase_migrations.schema_migrations` was not queried directly. Status is inferred from live schema probes, which match the migration intent. For formal migration history, run on a machine with Postgres credentials:

```bash
node scripts/migration-audit.mjs
npx supabase migration list --linked
```

**Verdict: PASS for release continuation.**
