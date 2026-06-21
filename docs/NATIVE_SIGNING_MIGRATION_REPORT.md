# Native Signing Migration Report

**Migration file:** `20260623100000_native_agreement_signing.sql`  
**Probe timestamp:** 2026-06-21T12:48:09.621Z  
**Status:** **FAIL — NOT APPLIED**

---

## Probe result

| Check | Result |
|-------|--------|
| All `agreements` columns | **FAIL** (15/15 missing) |
| All `users` columns | **FAIL** (2/2 missing) |
| `allApplied` | **false** |

Evidence: `docs/NATIVE_SIGNING_MIGRATION_PROBE.json`

---

## Missing columns

### agreements (all missing)

- signing_provider, signing_token, token_expires_at
- signed_pdf_storage_path, signing_record_storage_path, client_signature_storage_path
- downloaded_at, client_ip, client_user_agent, client_name_confirmed
- pdf_hash, signed_pdf_hash, signature_hash, audit_hash, signing_record_hash

### users (all missing)

- signature_storage_path, signature_uploaded_at

---

## Apply attempt

```bash
node scripts/apply-migration.mjs supabase/migrations/20260623100000_native_agreement_signing.sql
```

**Result:** **BLOCKED** — `Missing SUPABASE ref or SUPABASE_DB_PASSWORD` in `.env.local`

No `DATABASE_URL` or `SUPABASE_DB_PASSWORD` configured in this environment. Migration cannot be applied automatically.

---

## Required before verification continues

1. Add to `.env.local` (do not commit):
   - `SUPABASE_DB_PASSWORD=...` or `DATABASE_URL=postgresql://...`
2. Run:
   ```bash
   node scripts/apply-migration.mjs supabase/migrations/20260623100000_native_agreement_signing.sql
   node scripts/native-signing-migration-probe.mjs
   ```
3. Probe must exit **0** before E2E steps 2–11 can run.

---

## Verdict

**NOT PASS** — migration not applied on Supabase. Steps 2–11 are **BLOCKED**.
