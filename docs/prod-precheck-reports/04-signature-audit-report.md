# Signature Audit Report

**Status: PASS**

## Rules Enforced

- Signature timestamps (`signed_at`, `acknowledged_at`, `client_signed_at`) set only by webhooks/system
- Manual PATCH of audit timestamps returns **403**
- `document_audit_events` append-only (from ONB-3)
- SignWell webhook records `signed_by`, `provider`, `document_version`

## Verification

- `SIG-BLOCK-MANUAL`: PATCH `acknowledged_at` on SoS → rejected
- ONB verify: `signed_at` system-set on agreements
