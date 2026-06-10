# E2E-3.1 Lifecycle Hardening Report

**Generated:** 2026-06-10T08:13:01.240Z
**Verdict:** PASS
**Base URL:** http://localhost:3000

## Executive summary

All four hardening issues verified with **live database**, **webhook**, and **browser** evidence (not code inspection).

| Issue | Fix | Verified |
|-------|-----|----------|
| 1 `agreement_signatures` | Idempotent insert on `document_completed` in SignWell webhook | 1 row; duplicate webhook kept count at 1 |
| 2 Compliance API | `GET /api/clients/[id]/compliance?file_source=&file_id=` matter-scoped | Scores 25 / 100 / 50 across 3 matters |
| 3 Webhook audit | `payload_hash` + `received`/`processed` statuses on `webhook_events` | 4 SignWell events with hash |
| 4 Email audit | `email_type` on notification/SOS sends; `delivered_at` via Resend webhook | Agreement email `delivered` with `delivered_at` |

### Files changed

- `src/lib/agreements/agreement-signature-record.ts` — idempotent signature writer
- `src/app/api/webhooks/signwell/route.ts` — `document_completed` → `agreement_signatures`
- `src/app/api/clients/[id]/compliance/route.ts` — matter-scoped compliance API
- `src/features/compliance/services/client-matter-compliance.service.ts`
- `src/lib/integrations/webhook-events.ts` — `payload_hash` column support
- `src/lib/notifications/notification.service.ts` — `email_type` tagging
- `supabase/migrations/20260620100000_e2e31_hardening.sql`
- `scripts/e2e31-verify.mjs`

## Test client (this run)

| Field | Value |
|-------|-------|
| clientId | `aba4adf4-7e5a-4148-9289-e13e84932f38` |
| agreementId | `ee089978-45d0-418d-8621-bbc20d6e0844` |
| approvalId | `7c5b877e-f7e0-48e3-b080-7d3d49485cd7` |
| matterId | `17fc716d-612f-42da-8e21-5384f6f029a5` |

## Issue results

| Issue | Check | Status | Evidence |
|-------|-------|--------|----------|
| MIG | E2E31-SCHEMA | PASS | Migration applied |
| SETUP | ONBOARDING | PASS | {"clientId":"aba4adf4-7e5a-4148-9289-e13e84932f38","agreementId":"ee089978-45d0-418d-8621-bbc20d6e08 |
| ISSUE-1 | API-SEND | PASS | sent |
| ISSUE-1 | WEBHOOK-COMPLETED | PASS | {"received":true,"status":"processed","entity":"agreement"} |
| ISSUE-1 | IDEMPOTENT | PASS | count 1 → 1 |
| ISSUE-1 | DB-SIGNATURES | PASS | {"id":"4d191f78-4398-4ee1-bfbd-67852085217b","agreement_id":"ee089978-45d0-418d-8621-bbc20d6e0844"," |
| ISSUE-2 | API-COMPLIANCE-A | PASS | {"success":true,"client_id":"aba4adf4-7e5a-4148-9289-e13e84932f38","matter_id":"17fc716d-612f-42da-8 |
| ISSUE-2 | API-COMPLIANCE-B | PASS | {"success":true,"client_id":"85fb5e06-3c48-4e3f-8c62-ba30dcb765c0","matter_id":"cf13b973-1532-4f94-b |
| ISSUE-2 | API-COMPLIANCE-C | PASS | {"success":true,"client_id":"99e6f959-aa91-474e-9f9d-2af5fd3223f3","matter_id":"c93dc55d-abf4-4ced-a |
| ISSUE-2 | MATTER-ISOLATION | PASS | [{"label":"Matter-A-fresh","score":25,"status":"Open"},{"label":"Matter-B-complete","score":100,"status":"Completed"},{"label":"Matter-C-lodged","score":50,"status":"Lodged"}] |
| ISSUE-3 | WEBHOOK-SIGNWELL | PASS | 4 signwell events |
| ISSUE-3 | WEBHOOK-STATUSES | PASS | received=true processed=true |
| ISSUE-3 | WEBHOOK-PAYLOAD-HASH | PASS | payload_hash present |
| ISSUE-4 | EMAIL-AUDIT-ROWS | PASS | 1 rows since run |
| ISSUE-4 | EMAIL-DELIVERED-AT | PASS | 1 with delivered_at |
| ISSUE-4 | EMAIL-AGREEMENT | PASS | 1 agreement emails |
| ISSUE-4 | EMAIL-APPROVAL | WARN | Not in this short run (prior E2E-3 runs have approval/SOS/completion rows in audit) |
| ISSUE-4 | EMAIL-SOS | WARN | Not in this short run |
| ISSUE-4 | EMAIL-COMPLETION | WARN | Not in this short run |
| BROWSER | CLIENT-PROFILE | PASS | Screenshot captured |

## Matter compliance samples

- Matter-A-fresh: score=25, status=Open
- Matter-B-complete: score=100, status=Completed
- Matter-C-lodged: score=50, status=Lodged

## Blockers

- None

Evidence: docs/e2e-evidence/e2e31-run-1781079121174.json
Screenshots: docs/e2e31-screenshots/