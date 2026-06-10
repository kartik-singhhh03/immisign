# ImmiMate Platform — Beta Readiness Audit

**Date:** June 2026  
**Purpose:** What is built, what is incomplete, and what must be tested end-to-end before beta.

---

## Executive Summary

ImmiMate is **close to private beta** for migration-agent compliance workflows. The core matter lifecycle — **Client → Agreement → Preparation → Approval → Lodgement → SOS → File Notes** — is wired to real Supabase data and production integrations (SignWell, Resend, Stripe).

**Beta-ready today:** Compliance dashboard, agreements (main paths), approvals, clients, file notes, SOS, send document, document library, templates, settings, billing, notifications.

**Not beta-ready without work:** GS-1 search verification, analytics/reports, legacy placeholder routes, post-signup auth onboarding (cosmetic only).

---

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| **Compliance Dashboard** | ✅ Complete | Real attention queue, matter filters, audit readiness |
| **Service Agreements** | ⚠️ Partial | List, wizard, send, detail work; legacy sub-routes are stubs |
| **Application Approvals** | ✅ Complete | List, wizard, detail, client portal, lodgement transitions |
| **Send Document** | ✅ Complete | 6-step wizard, SignWell dispatch, notifications |
| **Document Library** | ⚠️ Partial | Library + upload in-page work; legacy `/upload` route is stub |
| **Templates** | ✅ Complete | CRUD, preview, RBAC |
| **Clients** | ✅ Complete | List, detail, 8 matter tabs, matter context |
| **File Notes** | ✅ Complete | Append-only, matter-scoped, export, system notes from webhooks |
| **Statement of Service** | ✅ Complete | Wizard, send, client acknowledge portal; not in sidebar |
| **Unified Intake (ONB)** | ✅ Complete | `/onboarding/new` — 5-step wizard, real API |
| **Auth Onboarding** | ❌ Stub | Post-signup wizard is UI-only, no DB persistence |
| **Settings (all sections)** | ✅ Complete | Agency, team, branding, clauses, matter types, financial, security |
| **Billing** | ✅ Complete | Stripe checkout, portal, seats (needs env config) |
| **Notifications** | ✅ Complete | In-app center, email via Resend, preferences, deadline cron |
| **Activity Feed** | ⚠️ Partial | Full page works; not in sidebar nav |
| **Global Search (GS-1)** | ⚠️ Partial | Code complete; migration + browser audit pending |
| **Analytics** | ❌ Stub | Empty state only |
| **Reports** | ❌ Stub | Export buttons, no backend |
| **Support** | ❌ Stub | Placeholder page |
| **Marketing Site** | ✅ Complete | Static pages, expected mock visuals |
| **Auth (login/signup)** | ✅ Complete | Supabase auth, workspace provisioning |
| **Microsoft OAuth** | ❌ Not started | "Coming soon" on login |

---

## Placeholder / Stub Routes (remove or redirect before beta)

These show *"This page is being prepared"* if hit:

- `/agreements/[id]/audit`, `/timeline`, `/preview`, `/edit`, `/signers` (legacy `(dashboard)` paths)
- `/documents/upload`, `/documents/[id]`, `/edit`, `/analytics` (legacy paths)
- `/support`
- Unmatched workspace catch-all → `PlaceholderDashboardPage`

**Action:** Redirect all to workspace equivalents or return 404.

---

## Integrations

| Integration | Status | Webhook / API |
|-------------|--------|---------------|
| **SignWell** | ✅ Live | `POST /api/webhooks/signwell` — signatures, PDFs, status updates |
| **Resend** | ✅ Live | `POST /api/webhooks/resend` — delivery tracking |
| **Stripe** | ✅ Live | `POST /api/stripe/webhooks` — subscriptions |
| **Supabase** | ✅ Live | Auth, RLS, storage, 43+ migrations |

---

## End-to-End Workflows — Beta Test Plan

Run every flow in a **real staging workspace** with test agency data. Mark PASS only after browser + DB verification.

### 1. Agency Setup
- [ ] Signup → workspace provisioned (`agencies`, `users` rows)
- [ ] Login → correct workspace slug redirect
- [ ] Settings → Agency profile saved
- [ ] Settings → RMA team invite sent and accepted
- [ ] Settings → Branding logo upload
- [ ] Settings → Matter types, clauses, payment schedules configured
- [ ] Settings → Financial surcharge % (used in ONB)
- [ ] Settings → Notification preferences saved

### 2. Client & Matter Intake
- [ ] **Quick create** from Clients list
- [ ] **Unified intake** `/onboarding/new` — all 5 steps, client + matter + fees saved
- [ ] Client detail loads with correct matter tabs
- [ ] Matter switcher works across agreement + approval files
- [ ] Deep links preserve `file_source` + `file_id`

### 3. Service Agreement Workflow
- [ ] New agreement wizard — all 6 steps
- [ ] Autosave draft persists on refresh
- [ ] Preview PDF generates
- [ ] Send agreement → SignWell envelope created
- [ ] Client receives SignWell email and signs
- [ ] Webhook updates status → **Signed**
- [ ] Signed PDF visible on agreement detail
- [ ] System file note created on sign event
- [ ] Notification appears in bell icon
- [ ] Agreement list filters (Draft, Sent, Awaiting, Signed) correct

### 4. Application Approval Workflow
- [ ] New approval wizard completes
- [ ] Documents attached
- [ ] Send for client approval → review link emailed
- [ ] Client portal `/review/[token]` — approve path
- [ ] Client portal — request changes path
- [ ] Agent sees status update + notifications
- [ ] Checklist items completable
- [ ] **Ready to lodge** transition
- [ ] **Lodged** transition + certificate
- [ ] Lodgement deadline reminder cron (if deadline set)

### 5. Send Document (standalone)
- [ ] Full 6-step wizard
- [ ] PDF upload + signer fields
- [ ] Preview step
- [ ] Send → SignWell dispatch
- [ ] Webhook → document status updated
- [ ] Appears in Document Library

### 6. Document Library
- [ ] List loads tenant documents only
- [ ] Upload new document
- [ ] Filter/search within library
- [ ] SignWell status badges correct

### 7. File Notes
- [ ] Search client/matter — results not cropped, charcoal highlight (not yellow)
- [ ] Select matter → timeline loads
- [ ] Add manual note → append-only, timestamped
- [ ] Note types render with correct badges
- [ ] System notes appear after agreement sign / approval events
- [ ] Export notes (PDF/CSV if enabled)
- [ ] Ctrl+Enter submit works
- [ ] Matter-scoped notes don't leak across files

### 8. Statement of Service
- [ ] Create SOS from wizard `/service-statements/new`
- [ ] Client search + service selection
- [ ] Fee summary correct
- [ ] Generate + send to client
- [ ] Client portal `/sos/[token]` — acknowledge
- [ ] SOS panel on client tab shows record
- [ ] System file note on acknowledge

### 9. Templates
- [ ] List agency templates
- [ ] Create / edit / preview (modal visible title, white bg)
- [ ] Delete with confirmation
- [ ] Used in agreement generation

### 10. Compliance Dashboard
- [ ] Attention queue shows real matters
- [ ] Summary cards filter queue
- [ ] Click row → correct client matter deep link
- [ ] Compliance score matches matter gates
- [ ] Activity preview links to full feed

### 11. Notifications (cross-cutting)
- [ ] Bell shows unread count
- [ ] Mark read / mark all read
- [ ] Click notification → correct `action_url`
- [ ] Email sent when preference enabled
- [ ] Agreement sent, signed, approval events trigger notifications

### 12. Global Search (GS-1)
- [ ] Apply migration `20260616100000_global_search.sql`
- [ ] `Ctrl+K` opens Command Center
- [ ] Client, matter, file number search returns grouped results
- [ ] Command actions (`new client`, `new agreement`) work
- [ ] Deep links open exact matter context
- [ ] Recent searches persist
- [ ] Performance under 500ms
- [ ] See `docs/GS1_SEARCH_AUDIT.md` for full checklist

### 13. Billing
- [ ] Plan display correct
- [ ] Stripe checkout (test mode)
- [ ] Customer portal opens
- [ ] Seat changes reflected
- [ ] Webhook updates subscription status

### 14. Security & Roles
- [ ] Owner / Admin / Agent / Read-only route access
- [ ] Read-only cannot create agreements
- [ ] MFA enroll + verify (Security settings)
- [ ] Session revoke works
- [ ] RLS — user cannot see other agency data

---

## Environment Checklist (before beta)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SIGNWELL_API_KEY=
SIGNWELL_WEBHOOK_SECRET=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CRON_SECRET=
```

- [ ] All migrations applied (including GS-1 search)
- [ ] SignWell webhook URL registered (staging + prod)
- [ ] Resend domain verified
- [ ] Stripe products/prices configured
- [ ] Cron job scheduled for deadline reminders

---

## Priority Fixes Before Beta

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Apply GS-1 migration + browser verify | 1 day |
| P0 | E2E test agreement sign webhook loop | 2 hours |
| P0 | E2E test approval client portal + lodgement | 2 hours |
| P0 | E2E test SOS send + acknowledge | 2 hours |
| P1 | Redirect/remove legacy placeholder routes | 2 hours |
| P1 | Hide Analytics, Reports, Support from nav | 30 min |
| P1 | Add Activity + SOS to sidebar (or document why hidden) | 1 hour |
| P2 | Wire or remove post-signup auth onboarding | 4 hours |
| P2 | Agreement sub-routes (audit, timeline) or remove links | 1 day |
| P3 | Analytics + Reports backend | Post-beta |

---

## Completed Design / UX Work (recent)

- ✅ Charcoal brand palette (no teal/green/blue)
- ✅ PageHeader typography (Instrument Serif + Geist) across CRM
- ✅ ImmiMate form system (inputs, selects, autofill fix)
- ✅ File Notes rebuild (DS-2)
- ✅ GS-1 Command Center (code complete, audit pending)
- ✅ Dialog/modal light theme fix (dark mode override)
- ✅ Onboarding wizard `inputClass` crash fixed

---

## Audit Documents Index

| Doc | Scope |
|-----|-------|
| `docs/PLATFORM_BETA_AUDIT.md` | This file — beta readiness |
| `docs/GS1_SEARCH_AUDIT.md` | Global search verification |
| `docs/DESIGN_SYSTEM_AUDIT.md` | Typography + color system |
| `docs/DS2_VISUAL_AUDIT.md` | DS-2 visual regression |
| `docs/prod-precheck-reports/` | Signature / compliance precheck |

---

## Sign-Off Criteria for Beta

Beta launch is approved when:

1. All **P0** items in Priority Fixes are done
2. Workflows **1–11** in the E2E test plan are PASS in staging
3. GS-1 search audit marked PASS with screenshots
4. No placeholder pages reachable from main navigation
5. SignWell + Resend webhooks confirmed in staging logs
6. At least one full matter completed: **Intake → Agreement → Approval → Lodgement → SOS → File Notes**
