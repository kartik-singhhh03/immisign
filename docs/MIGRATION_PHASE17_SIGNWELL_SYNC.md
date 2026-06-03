# Phase 17 migration — SignWell & signup schema sync

**File:** `supabase/migrations/20260607120000_phase17_signwell_signup_sync.sql`

## Apply to remote Supabase

```bash
node scripts/run-pending-migrations.mjs
```

Optional PostgREST schema reload:

```bash
node scripts/phase14-reload-postgrest.mjs
```

## What this migration adds

| Area | Changes |
|------|---------|
| **documents** | `sender_attestation_path`, `signwell_dispatch_error`, `signwell_external_signer_count`, `signwell_signing_links`, all sender/SignWell columns (idempotent) |
| **signers** | `document_id`, `role`, nullable `agreement_id` for standalone sends |
| **send_document_drafts** | Table + RLS if missing |
| **invitations** | `full_name`, `marn`, `phone`, pending token index |
| **agencies** | Unique index on `slug` (workspace URL signup) |
| **security_audit_logs** | Table + RLS if Phase 16 not applied yet |
| **rmas / agreements** | Agent signature columns for auto-sign on send |

## App code using new columns

- `POST /api/documents/send` — writes attestation path, signing link snapshot, clears/sets `signwell_dispatch_error`

## Verification

After apply, in SQL editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name IN ('sender_attestation_path', 'signwell_signing_links', 'signwell_dispatch_error');
```

Expect 3 rows.
