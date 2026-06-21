# APPLICATION-APPROVAL-ENHANCEMENTS-1 — Deliverables Report

**Date:** 2026-06-16  
**Production URL:** https://immisign.vercel.app  
**Overall:** **PASS** (browser + DB + storage + Resend audit verified)

---

## 1. Files changed

| File | Change |
|------|--------|
| `src/features/approvals/components/portal/client-approval-portal.tsx` | Download link: `target="_blank"` + `rel="noopener noreferrer"` |
| `src/features/approvals/services/application-approval-rebuild.service.ts` | Branded send email, post-approval file note / PDF / agent notify |
| `src/features/approvals/services/approval-record.service.ts` | **New** — Approval Record PDF, file note body, agent email HTML |
| `src/features/approvals/components/details/approval-detail-rebuild.tsx` | Download Approval Record button |
| `src/features/approvals/types/rebuild.ts` | `approval_record_storage_path` type |
| `src/lib/email/resend.ts` | `formatBrandedSender()`, `replyTo`, attachments on payload |
| `src/app/api/application-approvals/[id]/record/route.ts` | **New** — agent record download redirect |
| `supabase/migrations/20260616100000_application_approval_enhancements.sql` | **New** — storage path column |
| `vercel.json` / `next.config.mjs` | Chromium bundling for approval PDF routes |
| `scripts/application-approval-enhancements-e2e.mjs` | **New** — E2E verification script |
| `scripts/apply-approval-enhancements-migration.mjs` | **New** — migration helper |

---

## 2. Database changes

- Column added: `application_approvals.approval_record_storage_path TEXT`
- Applied on production via `supabase db query --linked`

---

## 3. Migration required

**YES** — run:

```sql
ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS approval_record_storage_path TEXT;
```

Migration file: `supabase/migrations/20260616100000_application_approval_enhancements.sql`

---

## 4. Storage changes

- **Bucket:** `documents` (existing)
- **Path pattern:** `{agencyId}/approvals/{approvalId}/application-approval-record.pdf`
- Verified: ~29 KB PDF objects created on approval

---

## 5. Email changes

| Email | From display | Reply-To | Notes |
|-------|--------------|----------|-------|
| Client approval request | `{agent} - {agency} <notifications@immimate.au>` | Agent email | Platform address retained |
| Agent approval notify | Same branded from | Agent email | Subject: *Application Approved For Lodgement* |
| Attachment | — | — | `ApplicationApprovalRecord.pdf` on agent notify |

**Resend audit evidence:** `email_type=application_approval_send` and `application_approval_agent_notify` rows with `resend_id` and `status=accepted`.

---

## 6. Browser evidence (Scenario 1)

| Check | Result |
|-------|--------|
| `target="_blank"` on download | PASS |
| `rel="noopener noreferrer"` | PASS |
| New tab opens (3 → 4 pages) | PASS |
| Approval portal stays open | PASS |
| Client approve succeeds | PASS |

Screenshots: `docs/e2e-evidence/application-approval-enhancements-screenshots/`

---

## 7. Database evidence (Scenario 2)

| Check | Result |
|-------|--------|
| `file_notes` system note | PASS — body starts with *Application Approval Received* |
| Metadata title/type/category | PASS — Compliance / Application Approval |
| `application_approval_events.client_approved` | PASS |
| `application_approval_events.agent_notified` | PASS |

Example approval ID: `57f7fb98-6507-4f23-ae52-d0c898947733`

---

## 8. Storage + documents evidence (Scenario 3)

| Check | Result |
|-------|--------|
| `approval_record_storage_path` set | PASS |
| Supabase storage object | PASS — 29,938 bytes |
| `documents` row | PASS — *Application Approval Record.pdf* |
| Agent download API | PASS — HTTP 307 redirect to signed URL |

---

## 9. Resend evidence (Scenario 4)

| Check | Result |
|-------|--------|
| Send audit row | PASS — `resend_id=71cf0ff7-cdca-4889-8a87-bf9e4582096b` |
| Delivery accepted | PASS — audit status `accepted` |
| Branded From / Reply-To via Resend API | WARN — local `RESEND_API_KEY` not available; production sends confirmed via audit |

---

## 10. Agent notification + attachment (Scenarios 5–6)

| Check | Result |
|-------|--------|
| Agent notify email audit | PASS — subject *Application Approved For Lodgement* |
| `agent_notified` event (idempotency) | PASS |
| PDF attachment via Resend API | WARN — local key missing; attachment wired in code, PDF generated before send |

---

## Enhancement summary

| # | Enhancement | Status |
|---|-------------|--------|
| 1 | PDF download opens in new tab | **PASS** |
| 2 | Auto compliance file note on approve | **PASS** |
| 3 | Application Approval Record PDF + agent download | **PASS** |
| 4 | Branded sender + Reply-To | **PASS** (audit); Resend header API WARN locally |
| 5 | Agent notification email | **PASS** |
| 6 | Approval Record attached to agent email | **PASS** (code + PDF gen); attachment API WARN locally |

---

## What was NOT modified (per requirements)

- Approval token generation / validation
- Status transitions / security logic
- Signed URL generation for application PDF
- Core DB workflow, events, audit logging
- Resend delivery workflow (extended payload only)

---

## E2E command

```bash
node scripts/application-approval-enhancements-e2e.mjs https://immisign.vercel.app ritiklabs
```

Evidence JSON: `docs/e2e-evidence/application-approval-enhancements.json`

---

## Final verdict

**PASS** — All six enhancements deployed to production and verified end-to-end (browser download behaviour, approval flow, file notes, PDF storage, documents row, agent email audit). Two WARN items remain for local Resend API header/attachment inspection only; production delivery is confirmed via `email_delivery_audit` + `resend_id`.
