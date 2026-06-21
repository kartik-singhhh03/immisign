# SignWell Production Report — IMMISIGN-PRODUCTION-CLOSURE-MASTER-1

**Date:** 2026-06-14  
**Environment:** https://immisign.vercel.app  
**Evidence:** `docs/e2e-evidence/agreement-production.json`, screenshot `agreement-production-screenshots/agreement-success.png`

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| PDF generated | **PASS** | 79,466 bytes via `/api/agreements/{id}/generate` on Vercel |
| Uploaded to storage | **PASS** | Supabase `secure_documents` signed URL HTTP 200 |
| Draft created | **FAIL** | SignWell API rejected request |
| Sent | **FAIL** | Blocked at SignWell dispatch |
| Webhook received | **NOT RUN** | No `signwell_document_id` created |
| Status updated | **NOT RUN** | Agreement remained `draft` |
| Timeline updated | **PARTIAL** | UI timeline ran; SignWell stage failed |
| Audit stored | **PARTIAL** | Activity log entry; no webhook_events row |

## Root Cause (Production Verified)

Browser screenshot and API error on send:

```
SignWell API Error (401):
"You've reached your API document limit for your current plan.
Please upgrade to an API plan or contact support@signwell.com for help."
```

Support reference from UI: `AGR-MQCYBXJB`

This is an **external account/plan blocker**, not an application code defect.

## What Works (Verified on Production)

- Agreement wizard: NEW / resume / fresh-new flows — **PASS**
- Chromium PDF generation on Vercel — **PASS** (after `vercel.json` + `next.config.mjs` tracing fix)
- Send UI timeline animation — **PASS**
- SignWell integration code path reached — **PASS** (API called; limit rejected)

## Configuration

| Variable | Vercel | Local |
|----------|--------|-------|
| `SIGNWELL_API_KEY` | Set (encrypted) | Not available via `env pull` |
| `SIGNWELL_WEBHOOK_ID` | Set | `68e25406-9795-48c0-bd4a-c74a0646ea61` (from prior audit) |
| `SIGNWELL_TEST_MODE` | Set on Vercel | — |

## Required Fix

1. Upgrade SignWell account to an API plan with available document quota, **or**
2. Contact support@signwell.com to reset/increase API document limit
3. Re-run: `node scripts/agreement-production-e2e.mjs`

## Status

**SignWell on Agreement Send: FAIL — deployment blocker (API plan limit)**
