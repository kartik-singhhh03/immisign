# Phase 12 — Application Approval Module: Implementation Report

**Date:** 2026-06-03  
**Status:** Implemented  
**Approved decisions:** Canonical `/approvals`, `matter_type_id` + `matter_reference`, client portal deferred, `activity_logs` only, no billing changes

---

## Summary

Phase 12 delivers a production-grade **internal migration-agency application approval workflow** on top of the existing `application_approvals` foundation. No second approval system was introduced. Stripe and billing code were not modified.

---

## Database (Phase 12.1)

**Migration:** `supabase/migrations/20260604100000_phase12_application_approvals.sql`

| Change | Description |
|--------|-------------|
| Extended `application_approvals` | `approval_number`, `matter_type_id`, `matter_reference`, assignees, priority, notes, lifecycle timestamps |
| `approval_number_counters` + `next_approval_number()` | Sequential `APP-YYYY-NNNN` per agency |
| `approval_attachments` | Versioned files in storage |
| `approval_checklist_items` | Eight default checklist rows per approval |
| Extended `approval_comments` | Threading, visibility, mentions, `author_role` |
| `notification_type` | Added `approval` |
| Status backfill | `pending_review` → `submitted`, `viewed` → `under_review`, `archived` → `closed` |
| RLS | Refined SELECT/UPDATE; policies for attachments and checklist |

**Apply:** `node scripts/phase12-apply-migration.mjs`

---

## Domain layer (Phase 12.2)

| Component | Path |
|-----------|------|
| Types + checklist defaults | `src/features/approvals/types/index.ts` |
| State machine (10 statuses) | `src/features/approvals/services/state-machine.ts` |
| Repository | `src/features/approvals/repositories/approvals.repository.ts` |
| Service | `src/features/approvals/services/approval.service.ts` |
| Activity + notifications | `src/features/approvals/lib/activity-log.ts` |
| Permissions | `src/lib/permissions/approval-actions.ts`, `approvals.ts` |
| API context (cookie + Bearer) | `src/features/approvals/lib/api-context.ts` |

**REST API**

- `GET/POST /api/approvals`
- `GET/PATCH /api/approvals/[id]`
- `POST /api/approvals/[id]/transition`
- `POST /api/approvals/[id]/comments`
- `PATCH /api/approvals/[id]/checklist`
- `POST /api/approvals/[id]/attachments`
- `GET /api/approvals/widgets`

**Server actions:** `src/features/approvals/actions/approvals.ts`

---

## UI (Phase 12.3–12.4)

| Page | Route |
|------|-------|
| List (filters, pagination) | `/workspace/[agency]/approvals` |
| Create | `/workspace/[agency]/approvals/new` |
| Detail (timeline, comments, checklist, attachments, actions) | `/workspace/[agency]/approvals/[id]` |

**Components**

- `approvals-list.tsx`, `approval-detail-page.tsx`, `approval-wizard.tsx`
- `status-badge.tsx`, `approval-widgets.tsx`

**Route consolidation**

- Nav: `dashboard-shell.tsx` → `/approvals`
- Legacy `/application-approvals` → `router.replace` to `/approvals` in catch-all

**Deferred:** Enhanced `/review/[token]` client portal (Phase 12.1 per approval).

---

## Checklist subsystem (Phase 12.4)

Default items created on every approval:

1. Passport received  
2. Form completed  
3. IELTS received  
4. Skills assessment received  
5. Employment evidence received  
6. Health completed  
7. Character completed  
8. Lodgement fee collected  

Toggle via detail UI → `PATCH /api/approvals/[id]/checklist` → `activity_logs` entry.

---

## Dashboard (Phase 12.5)

`ApprovalDashboardWidgets` on home dashboard — real counts from `/api/approvals/widgets`:

- Awaiting review  
- Awaiting approval  
- Changes requested  
- Ready to lodge  
- Recently approved (7d)  
- My assigned reviews  
- Open checklist items (aggregate)

`DashboardRepository` pending count now filters active workflow statuses only.

---

## Audit & notifications

- All workflow actions write to **`activity_logs`** (`reference_type: application_approval`).
- In-app **`notifications`** (`type: approval`) on assign, changes, approve, reject, lodge, close.
- Email: not wired in this phase (reuse Resend in follow-up if required).

---

## Files added / materially changed

- `supabase/migrations/20260604100000_phase12_application_approvals.sql`
- `src/features/approvals/**` (types, repo, service, UI, lib)
- `src/app/api/approvals/**`
- `src/lib/permissions/approval-actions.ts`
- `scripts/phase12-apply-migration.mjs`, `scripts/phase12-browser-audit.mjs`
- `scripts/phase11-2-migration-verify.mjs` (Phase 12 probes)
- Dashboard + shell nav updates

**Not modified:** `src/app/api/stripe/**`, billing pages, subscription migrations.

---

## Verification

See [PHASE12_VERIFICATION_REPORT.md](PHASE12_VERIFICATION_REPORT.md).

```bash
node scripts/phase12-apply-migration.mjs
node scripts/phase11-2-migration-verify.mjs
npm run dev:3001
node scripts/phase12-browser-audit.mjs http://localhost:3001 avc-migration-live
```

---

*End of Phase 12 implementation report.*
