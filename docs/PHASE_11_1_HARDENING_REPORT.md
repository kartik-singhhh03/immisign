# Phase 11.1 — Production Hardening Report

**Date:** 2026-06-03  
**Scope:** P0 fixes from `PLATFORM_AUDIT_PHASE11.md` + P1 validation guidance  
**Phase 12:** **Not started** (blocked until P0 verified in deployed environment)

**Legend:** PASS | WARNING | FAIL

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| P0-1 Settings role fix | **PASS** (code) | UI uses `isSettingsRestrictedForUiRole` from `db-roles.ts` |
| P0-2 Application approval RLS | **PASS** (migration) | Policies in `20260603170000_phase11_1_hardening.sql` — apply to DB |
| P0-3 SignWell dispatch | **PASS** (code) | `buildSignwellDispatchExtras` → subject, message, reminders, copied_contacts |
| P0-4 Send document hardening | **PASS** (code) | Preview, attestation PDF, `signwell_document_id`, webhook branch, server draft |
| P1-5 Stripe verification | **WARNING** | Manual / `scripts/phase10-billing-verify.mjs` |
| P1-6 Permissions verification | **WARNING** | Manual role simulator + `scripts/phase7-api-audit.mjs` |

**Static verifier:** `node scripts/phase11-1-hardening-verify.mjs` — all P0 checks **PASS** (2026-06-03).

---

## P0-1 — Settings role fix

| Check | Status | Evidence |
|-------|--------|----------|
| `isSettingsRestricted` uses UI roles | **PASS** | `SettingsPage.tsx` → `isSettingsRestrictedForUiRole(currentRole)` |
| Aligns with `db-roles.ts` | **PASS** | Maps Owner/Admin/Agent/Manager → write; Assistant/Staff → restricted |
| Billing page consistency | **PASS** | `BillingPage.tsx` → `isBillingRestrictedForUiRole` |

**Role behavior (settings edits disabled when restricted):**

| UI role | Settings restricted |
|---------|---------------------|
| Owner | No |
| Admin | No |
| Migration Agent | No |
| Case Manager | No |
| Assistant | Yes |
| Read-only staff | Yes |

---

## P0-2 — Application approval security

| Check | Status | Evidence |
|-------|--------|----------|
| RLS on `application_approvals` | **PASS** | SELECT tenant-scoped; INSERT/UPDATE owner/admin/manager/agent; DELETE owner/admin |
| RLS on `approval_comments` | **PASS** | SELECT via parent approval tenant; INSERT agent comments; DELETE owner/admin |
| Tenant isolation | **PASS** | `agency_id = public.get_tenant()` on all policies |

**Apply migration:**

```bash
node scripts/run-pending-migrations.mjs
# or: supabase db push
```

File: `supabase/migrations/20260603170000_phase11_1_hardening.sql`

---

## P0-3 — SignWell dispatch integration

| Field | Status | SignWell API mapping |
|-------|--------|----------------------|
| Email message | **PASS** | `message` from `wizard_form` / `dispatch_options.emailMessage` |
| Email subject | **PASS** | `subject` (default: agreement title) |
| CC sender | **PASS** | `copied_contacts` + `custom_requester_email` when `ccMe` |
| Reminders (7-day) | **PASS** | `reminders: true` when `autoRemind7Days` |
| Complete notification | **PASS** | `copied_contacts` when `emailOnComplete` |

**Code:** `src/lib/signwell/dispatch-extras.ts`, `src/features/agreements/services/signwell.service.ts`

---

## P0-4 — Send document hardening

| Check | Status | Evidence |
|-------|--------|----------|
| Document preview (review step) | **PASS** | PDF blob iframe + agent attestation preview API |
| Webhook linkage | **PASS** | `documents.signwell_document_id`; webhook resolves standalone docs |
| Sender signature in PDF packet | **PASS** | `generateSenderAttestationPdf` uploaded as `Agent-Certification.pdf` in SignWell `files[]` |
| Server-side wizard state | **PASS** | `send_document_drafts` + `GET/PUT/DELETE /api/documents/wizard-draft` |

**API routes added:**

- `/api/documents/wizard-draft`
- `/api/documents/send-document-preview`
- Updated `/api/documents/send`
- Updated `/api/webhooks/signwell`

**UI:** `SendDocumentPage.tsx` — server autosave, review previews, dispatch options (ccMe, reminders, emailOnComplete)

---

## P1-5 — Stripe verification

| Check | Status | Action |
|-------|--------|--------|
| Test card subscribe | **WARNING** | Owner login → Billing → checkout with `4242…` |
| Seat billing | **WARNING** | Invite user → accept → verify Stripe quantity |
| Customer portal | **WARNING** | Billing → Manage subscription |
| Cancel / seat change | **WARNING** | Portal cancel; deactivate user → seat sync |

**Script:** `node scripts/phase10-billing-verify.mjs` (requires Stripe test mode env + session)

---

## P1-6 — Permissions verification

| Role | Suggested checks |
|------|------------------|
| Owner | Billing write, settings write, agreements send, documents send |
| Admin | Same as owner except owner-only pages if any |
| Migration Agent | Agreements/documents send; no billing |
| Assistant | Settings read-only; nav locks billing/settings |
| Read-only staff | No writes; locked settings |

**Tools:**

1. Sidebar role simulator (dev) — verify locks match `dashboard-shell.tsx`
2. `node scripts/phase7-api-audit.mjs`
3. Create dedicated test users per role (team invite) for production-like checks

---

## Deployment checklist

1. [ ] Apply `20260603170000_phase11_1_hardening.sql` to production/staging Supabase
2. [ ] Deploy application build with Phase 11.1 code
3. [ ] Run `node scripts/phase11-1-hardening-verify.mjs` in CI or post-deploy
4. [ ] Send one agreement — confirm SignWell email shows custom message + CC
5. [ ] Send one standalone document — confirm two files in SignWell + webhook updates `signwell_status`
6. [ ] Complete P1 Stripe + permissions manual passes
7. [ ] Only then begin **Phase 12** (Application Approval Module)

---

## Phase 12 gate

| Gate | Met? |
|------|------|
| All P0 code merged | Yes |
| P0 static verify | Yes |
| P0 DB migration applied in target env | **Operator** |
| P0 smoke test (agreement + document send) | **Operator** |
| P1 Stripe + permissions | **Operator** |

**Recommendation:** Treat Phase 11.1 as **PASS for development** and **CONDITIONAL PASS for production** until migration + smoke tests complete.
