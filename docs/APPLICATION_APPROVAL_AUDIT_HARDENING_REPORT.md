# Application Approval Audit Hardening Report

**Task:** Phase 1 — APPLICATION APPROVAL AUDIT HARDENING  
**Date:** 2026-06-21  
**Production URL:** https://immisign.vercel.app  
**Overall status:** **FAIL on production** — fixes implemented locally, **not deployed**

---

## Executive summary

Production still runs commit `f69c722` without audit enrichment or `document_audit_events` writes. Client Audit panels correctly show **"Not Provided"** for sent/viewed/acknowledged because the data is not in `document_audit_events` on production, even when `application_approvals.sent_at` etc. exist.

Local implementation adds full audit trail writes + API enrichment + UI fields. **PASS requires deploy + migration + production browser E2E.**

---

## Workflow trace

| Stage | DB fields | Timeline (`application_approval_events`) | Audit (`document_audit_events`) | UI |
|-------|-----------|----------------------------------------|----------------------------------|-----|
| Approval Created | `application_approvals` row | — | — | Approval detail |
| Approval Sent | `sent_at`, `client_sent_at` | `approval_sent` | **`sent`** + resend_id, delivery_status, provider=Resend | Audit: Sent At, Email Status |
| Client Opens Link | `viewed_at`, `client_viewed_at` | `client_viewed` | **`viewed`** + IP, user_agent | Audit: Viewed At |
| Client Downloads PDF | — | `client_downloaded` | **`completed`** action=`application_downloaded` | Audit: Downloaded At |
| Client Approves | `approved_at`, `client_name_confirmed`, `client_ip` | `client_approved` | **`signed`**, **`acknowledged`** | Approved At/By, IP |
| File Note Created | `file_notes` row | — | **`completed`** action=`file_note_created` | Audit: File Note Created |
| Approval Record PDF | `approval_record_storage_path` | `approval_record_generated` | **`generated`** action=`approval_record_generated` | Generated At |
| Agent Notified | — | `agent_notified` | **`completed`** action=`agent_notified` + resend_id | Audit: Agent Notified |

---

## Implementation (local — not on production)

### Code changes

| File | Change |
|------|--------|
| `src/features/approvals/lib/application-approval-audit.ts` | `recordApplicationApprovalAudit()`, enrichment from `application_approvals`, provider override |
| `src/features/approvals/services/application-approval-rebuild.service.ts` | Audit at send, view, approve, download, file note, record PDF, agent notify |
| `src/app/api/clients/[id]/audit-events/route.ts` | Calls `enrichApplicationApprovalAuditEvents()` |
| `src/features/clients/components/ClientAuditPanel.tsx` | Sent/Viewed/Downloaded/Acknowledged/Generated/File Note/Agent Notified; no false "Not Provided" when enriched |
| `scripts/backfill-application-approval-audit.mjs` | Backfill legacy approvals (ran previously on prod per prior session — re-run after deploy) |

### Send event metadata (local)

```json
{
  "event_type": "sent",
  "provider": "Resend",
  "metadata": {
    "resend_id": "<id>",
    "email_delivery_status": "accepted",
    "original_filename": "<pdf>",
    "email_provider": "Resend"
  }
}
```

---

## Verification evidence

### Production (2026-06-21)

| Check | Result | Evidence |
|-------|--------|----------|
| Audit enrichment API deployed | **FAIL** | Production at `f69c722` — no `application-approval-audit.ts` in deployed commit |
| Client Audit Sent At populated | **FAIL** | User-reported; production code lacks enrichment |
| Provider not "Not Provided" | **FAIL** | Same root cause |
| Full browser flow on production | **NOT RUN** | Blocked until deploy |

### Local compliance E2E (`docs/e2e-evidence/application-approval-compliance.json`)

| Check | Result |
|-------|--------|
| `sent_at` on approval row | PASS |
| `audit_sent` in document_audit_events | **FAIL** (send likely failed without Resend key in local env) |
| `audit_viewed`, `approved_at`, file_note | **FAIL** (flow incomplete) |
| **Overall** | **FAIL** |

Screenshots: `docs/e2e-evidence/application-approval-production-screenshots/` (prior runs — pre-hardening deploy)

---

## Required before PASS

1. Deploy local approval audit changes to Vercel  
2. Confirm `RESEND_API_KEY` on production  
3. Run full production flow: Create → Upload → Send → Open → Download → Approve  
4. Verify Client Audit tab — **zero "Not Provided"** where data exists  
5. Re-run `node scripts/application-approval-compliance-e2e.mjs https://immisign.vercel.app <agencySlug>`  
6. Attach production screenshots to this report  

---

## Status by requirement

| Requirement | Local code | Production |
|-------------|------------|------------|
| sent_at + resend_id + provider on send | Implemented | **Not deployed** |
| viewed_at + IP + user_agent on view | Implemented | **Not deployed** |
| application_downloaded audit event | Implemented | **Not deployed** |
| approved_at + client_name_confirmed + IP | Existing + audit writes | Partial |
| file_note_created audit event | Implemented | **Not deployed** |
| approval_record_generated audit event | Implemented | **Not deployed** |
| agent_notified audit event | Implemented | **Not deployed** |
| UI shows all fields | Implemented | **Not deployed** |

**Verdict: FAIL — deploy and re-verify required.**
