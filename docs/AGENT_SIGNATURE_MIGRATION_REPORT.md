# Agent Signature Migration Report

Generated: 2026-06-21T16:23:44.239Z

## Verdict: **NOT PASS**

| Migration | Status | Notes |
|-----------|--------|-------|
| `20260623100000_native_agreement_signing.sql` | APPLIED | User columns + sync trigger |
| `20260608100000_agent_signature_sync_on_delete.sql` | NOT APPLIED | Delete sync trigger |

## User columns (`users`)

| Column | Exists |
|--------|--------|
| `signature_storage_path` | YES |
| `signature_uploaded_at` | YES |

## Trigger probe (postgres)

| Check | Result |
|-------|--------|
| `sync_user_default_signature_path` function | YES |
| `clear_user_default_signature_path` function | NO |
| `clear_user_default_signature_path` trigger | NO |



## Action required

Apply pending migration(s) via `node scripts/apply-agent-signature-migration.mjs` or Supabase SQL editor.
