# Phase 11.4 — Final Production Verification

**Date:** 2026-06-03  
**Environment:** `http://localhost:3001` → Supabase `wnohcmgmyhamsbmkiybc`  
**Phase 12:** **Not started**

---

## Launch readiness score: **79 / 100**

| Area | Weight | Score | Status |
|------|--------|-------|--------|
| Database / migrations | 15% | 15/15 | **PASS** |
| Agreement wizard + SignWell | 20% | 18/20 | **PASS** |
| Send Document flow | 15% | 11/15 | **WARNING** |
| Stripe billing | 15% | 8/15 | **WARNING** |
| Permissions matrix | 10% | 9/10 | **PASS** (static + UI sample) |
| SignWell integration | 10% | 8/10 | **PASS** (agreement); doc rate-limited |
| Settings persistence | 15% | 10/15 | **PASS** (DB + UI) |

**Verdict:** Suitable for **controlled production pilot** after resolving Stripe key alignment and SignWell trial/production limits. Not a full public launch until checkout E2E and Send Document browser E2E are green.

---

## Prerequisites

| Check | Result |
|-------|--------|
| `node scripts/phase11-2-migration-verify.mjs` | **PASS** (exit 0) |
| `node scripts/phase11-2-permissions-audit.mjs` | **PASS** |
| Dev server `npm run dev:3001` | Required for UI/API tests |

---

## 1. Agreement wizard

| Step | Result | Evidence |
|------|--------|----------|
| Create agreement (API) | **PASS** | `POST /api/agreements/standard` → 200 |
| PDF generation | **PASS** | `result.size` ≈ 85KB, storage path returned |
| SignWell document created | **PASS** | `signwellResult.id` returned |
| Custom message / reminders / CC | **PASS** | `message`, `reminders: true`, `copied_contacts`, `custom_requester_email` in SignWell payload |
| Client-only recipients | **PASS** | Single recipient `primary_applicant`; no agent signer in `recipients` |
| Auto agent signature (DB) | **PASS** | `agent_signed_at` set on new agreement `eb0b0af0-…` |
| Wizard UI (start) | **PASS** | Screenshot |

**Screenshots**

| File | Description |
|------|-------------|
| [04-agreement-wizard-start.png](verification-screenshots/04-agreement-wizard-start.png) | New agreement wizard loaded |
| [05-agreements-list-after-send.png](verification-screenshots/05-agreements-list-after-send.png) | Agreements list after successful send |

**Notes:** Older agreements sent before Phase 11.3 repair may lack `agent_signed_at`; new sends are correct.

---

## 2. Send Document flow

| Step | Result | Evidence |
|------|--------|----------|
| Page load (browser) | **WARNING** | Intermittent redirect to `/onboarding` when auth store not hydrated before navigation |
| Upload / signers / email / preview (browser) | **NOT RUN** | Blocked by onboarding redirect in automation |
| API dispatch (Bearer) | **WARNING** | Auth **PASS** after fix; SignWell returned **422** trial limit (5 docs/day) |
| Sender signature (pre-SignWell) | **PASS** | API reached `applySenderSignatureOnDocumentSend` before SignWell error |
| `signwell_document_id` persistence | **NOT VERIFIED** | Dispatch did not complete due to SignWell quota |
| Webhook status update | **NOT VERIFIED** | No completed SignWell doc in this run |

**Screenshots**

| File | Description |
|------|-------------|
| [11-4-send-document-partial.png](verification-screenshots/11-4-send-document-partial.png) | Onboarding screen (login routing issue in automation) |
| [99-error-state.png](verification-screenshots/99-error-state.png) | Error/timeout state during send-doc automation |

**Defect fixed during verification:** `POST /api/documents/send` now accepts `Authorization: Bearer` (aligned with agreements API).

**Manual re-test:** Log in as owner → complete onboarding skip if shown → `/workspace/avc-migration-live/documents/send` → dispatch when SignWell quota allows.

---

## 3. Stripe billing

| Check | Result | Evidence |
|-------|--------|----------|
| Price IDs valid ($49 / $10 AUD) | **PASS** | `phase11-2-stripe-verify.mjs` |
| Seat math formula | **PASS** | `phase11-2-seat-math-verify.mjs` (3 included, +$10 from 4th user) |
| Billing page loads (owner) | **PASS** | Screenshot |
| Checkout session (test card) | **NOT RUN** | Live secret + test publishable key mismatch |
| Customer portal | **NOT RUN** | Same |
| 4th user seat sync | **NOT RUN** | Requires checkout + invite E2E |

**Screenshots**

| File | Description |
|------|-------------|
| [02-billing-page.png](verification-screenshots/02-billing-page.png) | Billing page for owner session |

**Blocker:** `STRIPE_SECRET_KEY` is **live** while `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **test** placeholder — see [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md).

---

## 4. Permissions matrix

### Static enforcement — **PASS**

`node scripts/phase11-2-permissions-audit.mjs` — checkout/portal gated to owner/admin; settings helpers wired; nav locks present.

### Role matrix (expected)

| Role | Billing | Settings write | Team | Agreements | Send doc | Approvals |
|------|---------|----------------|------|------------|----------|-----------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration Agent | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Case Manager | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Assistant | ✗ | ✗ | ✗ | read | read | ✗ |
| Read-only staff | ✗ | ✗ | ✗ | read | read | ✗ |

### UI / API sampling

| Check | Result |
|-------|--------|
| Owner billing + settings pages | **PASS** (screenshots) |
| Bearer token on cookie-only APIs | **WARNING** | Stripe/wizard-draft return 401 without session cookie; browser flows OK |

**Screenshots:** [01-login-dashboard.png](verification-screenshots/01-login-dashboard.png), [03-settings-page.png](verification-screenshots/03-settings-page.png)

**Recommendation:** Full per-role UI pass via sidebar role simulator (dev) before launch.

---

## 5. SignWell

| Check | Result |
|-------|--------|
| Agreement create + send | **PASS** |
| Dispatch options (message, CC, reminders) | **PASS** |
| Agent excluded from recipients | **PASS** |
| Document send (API) | **WARNING** — trial daily limit |
| Completion webhooks | **NOT VERIFIED** in this run |
| Signed PDF archive | **NOT VERIFIED** in this run |

Historical agreements with `signwell_document_id` exist in DB (2 rows).

---

## 6. Settings (persistence / DB)

| Area | DB rows (AVC agency) | UI |
|------|----------------------|-----|
| Agency profile | agencies + branding | **PASS** (settings screenshot) |
| Branding | branding_settings (1) | **PASS** |
| RMA Team | rmas (0) | Page loads |
| Matter types | matter_types (10) | **PASS** |
| Matter type fields | table exists (42 global) | **PASS** |
| Clauses | agreement_clauses (13) | **PASS** |
| Payment schedules | payment_schedules (3) | **PASS** |
| Defaults | matter_defaults (1) | **PASS** |

Wizard draft APIs: agreement draft PUT/GET **PASS** via owner session (browser cookie flow); document draft not re-tested.

---

## Bugs fixed in Phase 11.4

| Fix | File |
|-----|------|
| Bearer token auth on document send API | `src/app/api/documents/send/route.ts` |
| Direct Postgres host for migrations (pooler fallback) | `scripts/lib/resolve-database-url.mjs` |
| Send-document browser audit: direct URL + file input upload | `scripts/send-document-browser-audit.mjs` |

---

## Remaining blockers

1. **Stripe environment mismatch** — align live vs test keys per environment ([STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md)).
2. **SignWell trial limit** — automated sends hit 5 documents/day; use production account or wait for reset before more E2E.
3. **Send Document browser E2E** — complete owner login → workspace (avoid onboarding trap) → full wizard screenshot set.
4. **Stripe checkout / portal / seat invite E2E** — owner manual test with test card `4242…`.
5. **Webhook + signed PDF** — confirm with one real SignWell completion event.

---

## Verification commands

```bash
npm run dev:3001
node scripts/phase11-2-migration-verify.mjs
node scripts/phase11-2-permissions-audit.mjs
node scripts/phase11-4-browser-verify.mjs http://localhost:3001 avc-migration-live
node scripts/phase11-4-api-send-document.mjs http://localhost:3001
```

Reports: `docs/verification-screenshots/phase11-4-api-report.json`, `phase11-4-browser-report.json`

---

## Phase 12 gate

| Requirement | Met? |
|-------------|------|
| Schema repair (11.3) | **YES** |
| Agreement E2E | **YES** |
| Send Document E2E | **PARTIAL** |
| Stripe E2E | **NO** |
| Full permissions UI matrix | **PARTIAL** |
| Launch score ≥ 85 | **NO** (79) |

**Phase 12 (Application Approvals module) remains deferred.**

---

## Related documents

- [PHASE_11_3_DATABASE_REPAIR_REPORT.md](PHASE_11_3_DATABASE_REPAIR_REPORT.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md)
- [verification-screenshots/README.md](verification-screenshots/README.md)
