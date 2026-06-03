# Phase 11 — Platform Hardening & Gap Analysis

**Audit date:** 2026-06-03  
**Scope:** Read-only code and schema review + targeted runtime checks (wizard drafts table, phase7 schema).  
**Rule:** No new product features in this phase — findings only.

**Legend**

| Status | Meaning |
|--------|---------|
| **PASS** | Implemented and wired end-to-end with acceptable behavior |
| **WARNING** | Works partially, inconsistent, or fragile — fix before scaling |
| **FAIL** | Broken, missing, or misleading vs stated requirements |

---

## Executive summary

| Module | PASS | WARNING | FAIL |
|--------|------|---------|------|
| 1. Agreement Wizard | 5 | 4 | 0 |
| 2. Send Document | 3 | 4 | 3 |
| 3. Billing | 7 | 5 | 0 |
| 4. Permissions | 4 | 6 | 1 |
| 5. Settings | 6 | 4 | 0 |
| 6. Agreements | 5 | 5 | 2 |
| 7. Application Approvals (baseline) | 1 | 3 | 4 |

**Top blockers before production hardening**

1. **Settings UI role check** compares DB role strings to UI labels — staff restrictions never apply in-page.
2. **Send Document** — no file preview; sender signature not burned into PDF; SignWell webhooks don’t track standalone documents.
3. **Agreement email options** (custom message, CC, reminders) stored but not sent to SignWell.
4. **Application Approvals** — RLS enabled with **no policies**; dual route stacks and status enum drift.

---

## 1. Agreement Wizard

| Check | Status | Evidence |
|-------|--------|----------|
| Step persistence (draft API) | **PASS** | `agreement-wizard.tsx` ↔ `GET/PUT/DELETE /api/agreements/wizard-draft`; table `agreement_wizard_drafts` (migration `20260603120000_*`); runtime: table exists |
| Full form in metadata on send | **PASS** | `POST /api/agreements/standard` stores `metadata.wizard_form`, clauses, matter config |
| Clause selection persists | **PASS** | `TermsStep` → `selectedClauseIds` → `resolveSelectedClauses` → preview/PDF |
| Dynamic matter fields persist | **PASS** | `matterFieldValues` in form + `matter_type_fields` in settings; rendered in `agreement-preview-html` |
| Preview vs PDF (pre-send) | **PASS** | Both use `buildAgreementPreviewHtml` via `DocumentGenerationService.renderWizardAgreementPdf` |
| Preview vs PDF (post-send agent sig) | **WARNING** | Agent block applied only at send (`AgentSignatureService`); preview before send shows blank agent box |
| Agreement ref restore from draft | **WARNING** | Draft saves `agreementRef` but reload regenerates provisional ref |
| Autosave error handling | **WARNING** | PUT failures swallowed (`.catch(() => {})`) |
| Matter step validation | **WARNING** | Only `matterType` required; RMA / required dynamic fields not enforced |
| Legacy `NewAgreementPage` route | **WARNING** | Simulated save still reachable via some paths; canonical route uses `AgreementWizard` |

**Code paths:** `src/features/agreements/components/wizard/`, `src/app/api/agreements/standard/route.ts`, `src/app/workspace/[agency]/agreements/new/page.tsx`

---

## 2. Send Document

| Check | Status | Evidence |
|-------|--------|----------|
| File upload to storage | **PASS** | `SendDocumentPage` → `useDocuments().addDocument` |
| External signers only (UI + API) | **PASS** | `filterExternalDocumentSigners`; `documents/send/route.ts` |
| Sender auto-signature (DB) | **PASS** | `applySenderSignatureOnDocumentSend` sets `sender_signed_at`, etc. |
| SignWell create + send | **PASS** | `signwellClient.createDocument` + `sendDocument` |
| Activity log on send | **PASS** | `activity_logs` insert with auto-signature note |
| Document preview before send | **FAIL** | Review step is email mockup only — no PDF/file preview |
| Sender signature on PDF file | **FAIL** | Metadata on `documents` row only; uploaded file unchanged before SignWell |
| SignWell ID + webhooks for documents | **FAIL** | `signwell_document_id` not stored; `webhooks/signwell` resolves agreements only |
| Wizard state persistence | **FAIL** | Client-side “autosave” is UI timer only — refresh loses state |
| Signer DB insert failures | **WARNING** | `console.warn` only — dispatch may proceed without rows |

**Code paths:** `src/features/documents/components/SendDocumentPage.tsx`, `src/app/api/documents/send/route.ts`, `src/lib/signatures/document-sender-signature.ts`

---

## 3. Billing

| Check | Status | Evidence |
|-------|--------|----------|
| ImmiSign plan env vars | **PASS** | `STRIPE_IMMISIGN_BASE_PRICE_ID`, `STRIPE_IMMISIGN_SEAT_PRICE_ID` in `env.ts` + `plan.ts` |
| Checkout (owner/admin) | **PASS** | `POST /api/stripe/checkout` → base + seat line items |
| Seat preview API | **PASS** | `GET /api/stripe/seats?role=` |
| Seat sync API | **PASS** | `POST /api/stripe/seats` → `syncSubscriptionSeats` |
| Billing page + portal | **PASS** | `BillingPage.tsx`; `POST /api/stripe/portal` |
| Webhook signature + idempotency | **PASS** | `webhooks/route.ts` + `webhook_logs` |
| Invite seat warning | **PASS** | Settings dialog + `team/invite` response `billing.warning` |
| Seat sync on invite/accept | **PASS** | `stripeService.syncSubscriptionSeats` (non-blocking) |
| Seat count formula | **PASS** | Owner excluded; `49 + max(0, n-3)*10` in `seats.ts` |
| Invite warning vs Stripe charge timing | **WARNING** | Preview counts pending invite; Stripe quantity uses **active** users — charge typically on **accept** |
| Billing GET open to all roles | **WARNING** | `GET /api/stripe/billing`, `/usage` — no owner/admin gate |
| `requireActiveSubscription` | **WARNING** | Defined in `permissions.ts` but **not called** by feature APIs |
| E2E billing in CI | **WARNING** | Requires live Stripe + logged-in owner session — not automated in repo |

**Code paths:** `src/lib/stripe/`, `src/app/api/stripe/*`, `src/features/billing/components/BillingPage.tsx`

**Manual verification still required:** Subscribe with test card, portal, webhook delivery in Stripe Dashboard, deactivate user → sync seats.

---

## 4. Permissions

### Declared matrix (`src/lib/auth/db-roles.ts`)

| Capability | Owner | Admin | Agent | Manager | Assistant (`support`) | Staff (`viewer`/`reviewer`) |
|------------|:-----:|:-----:|:-----:|:-------:|:---------------------:|:---------------------------:|
| Billing (page) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Billing mutations | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings (general) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Settings → Team | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings → Payment schedules | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Templates write | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Records write | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

### Enforcement audit

| Check | Status | Evidence |
|-------|--------|----------|
| Middleware session + agency membership | **PASS** | `middleware.ts`, `requireAgencyAccess` |
| Workspace path guard (`canAccessWorkspacePath`) | **PASS** | `workspace/[agency]/[[...path]]/page.tsx` |
| Desktop nav locks (billing/settings) | **PASS** | `dashboard-shell.tsx` |
| Team invite API (owner/admin) | **PASS** | `team/invite/route.ts` |
| Templates API (`api-auth` guards) | **PASS** | `guards.templatesWrite` |
| **Settings page `isSettingsRestricted`** | **FAIL** | Compares `"support"`/`"viewer"` to UI roles (`"Assistant"`/`"Read-only staff"`) — `SettingsPage.tsx:142` |
| Mobile nav role locks | **WARNING** | Mobile drawer shows all links without desktop lock logic |
| `requireRole()` helper | **WARNING** | Defined in `auth.ts`, **zero call sites** |
| Most mutation APIs | **WARNING** | Auth-only — no role 403 (documents send, agreements standard, branding) |
| Billing read APIs | **WARNING** | Bypass page guard via direct API |
| Middleware role checks | **WARNING** | Auth only — no role-based route deny |

**Test accounts:** No seed script in repo for Owner/Admin/Agent/Staff matrix — must be created manually in Supabase Auth + `users` rows.

---

## 5. Settings

| Section | DB persistence | Status | Notes |
|---------|----------------|--------|-------|
| Agency Profile | `agencies` via `AgencyRepository` | **PASS** | Client Supabase + RLS |
| RMA Team | `rmas`, invites → `invitations` | **PASS** | + signature API `PATCH .../rmas/[id]/signature` |
| Branding | `branding_settings`, `agency_logos` | **PASS** | Logo via API; colors via repository |
| Matter Types | `matter_types`, `matter_type_fields` | **WARNING** | Add/delete; **flag updates not in UI** |
| Clauses | `agreement_clauses` | **WARNING** | Create/delete only — **no edit**; wizard fields (`clause_key`, etc.) not set on create |
| Payment Schedules | `agency_payment_schedules` | **PASS** | Add/delete; “Save” on panel is toast-only |
| Defaults | `matter_defaults` | **PASS** | Upsert via `MatterDefaultsRepository` |
| User signatures (profile) | `user_signatures` | **PASS** | `/api/signatures/*` |
| Dual signature models | RMA + user_signatures | **WARNING** | Both exist; auto-send prefers RMA then fallback |

**Architecture:** Most settings = browser Supabase, not REST CRUD layer.

---

## 6. Agreements (send pipeline)

| Check | Status | Evidence |
|-------|--------|----------|
| Reference allocation | **PASS** | `allocateAgreementReference` in `standard/route.ts` |
| PDF generation (wizard) | **PASS** | `DocumentGenerationService` + failure handling |
| Auto agent signature on PDF | **PASS** | `AgentSignatureService` + `regenerateAgreementPdf`; audit message |
| SignWell external signers only | **PASS** | Agent removed from recipients in `signwell.service.ts` |
| SignWell webhook (agreements) | **PASS** | `api/webhooks/signwell/route.ts` |
| Agreement audit trail | **PASS** | `audit_logs` + `activity_logs` |
| Dispatch email options → SignWell | **FAIL** | `emailMessage`, `ccMe`, `autoRemind7Days` in metadata — **not** in SignWell payload |
| Send without RMA signature configured | **FAIL** | Hard error — correct but blocks send until RMA signature set |
| All signers routing_order = 1 | **WARNING** | No sequential signing |
| Client ref vs allocated ref in UI | **WARNING** | Success screen may show provisional ref |
| Non-wizard PDF path | **WARNING** | Template merge path still separate from wizard HTML |

**Code paths:** `src/app/api/agreements/standard/route.ts`, `src/features/agreements/services/signwell.service.ts`, `src/features/agreements/services/agent-signature.service.ts`

---

## 7. Application Approvals (Phase 12 baseline — not scored as product-ready)

| Check | Status | Evidence |
|-------|--------|----------|
| Schema `application_approvals` | **PASS** | Migration `20260529000002_*` |
| Feature service + state machine | **WARNING** | `features/approvals/*` — not fully wired to UI |
| Workspace UI (dual routes) | **WARNING** | `/application-approvals` vs `/approvals` — different repos/flows |
| RLS on approvals tables | **FAIL** | RLS **enabled**, **no policies** on `application_approvals` / `approval_comments` |
| REST API for approvals | **FAIL** | None under `src/app/api` |
| Real document upload | **FAIL** | Mock paths / minimal inserts |
| Client review portal | **WARNING** | `/review/[token]` — dummy PDF in places |
| Status enum alignment | **WARNING** | `pending_review` vs list repo expecting `pending` |

**Phase 12 should consolidate:** one route namespace, RLS policies, single repository, storage upload, email on send, retire `public.approvals` duplicate if unused.

---

## Recommended fix order (pre–Phase 12)

| Priority | Item | Module |
|----------|------|--------|
| P0 | Fix `isSettingsRestricted` to use `dbRoleToUi` / `uiRoleToDb` | Permissions / Settings |
| P0 | Add RLS policies for `application_approvals` | Approvals |
| P1 | Pass wizard dispatch options to SignWell | Agreements |
| P1 | Store `signwell_document_id` on documents + webhook branch | Send Document |
| P1 | Mobile nav respect `canAccessWorkspacePath` | Permissions |
| P2 | Clause edit + matter type flag UI | Settings |
| P2 | Send Document PDF preview (or explicit “no preview” UX) | Send Document |
| P2 | Billing read API restrict to owner/admin | Billing |

---

## Phase 12 — Application Approval Module (readiness)

**Start when:** P0 items above are scheduled (RLS at minimum).

**Existing assets to extend**

- Tables: `application_approvals`, `approval_comments`
- Feature layer: `src/features/approvals/` (service, repository, actions, wizard)
- UI entry: `src/components/saas/application-approvals/`, `src/app/workspace/[agency]/approvals/`

**Greenfield work likely required**

- Tenant RLS policies + server actions audit
- Unified list/create/detail under `/workspace/[agency]/application-approvals`
- Storage pipeline for approval documents (reuse `secure_documents` patterns)
- Client token review flow with real signed URLs
- Notifications (Resend) on send for review
- Permissions aligned with `ApprovalPermissions` + API 403s

---

## Verification commands (optional)

```bash
node scripts/check-wizard-drafts-table.mjs
node scripts/verify-phase7-schema.mjs
node scripts/phase10-billing-verify.mjs   # needs dev server + session for full PASS
node scripts/phase7-api-audit.mjs         # needs auth headers
```

---

*End of Phase 11 audit. No new functionality was implemented during this audit.*
