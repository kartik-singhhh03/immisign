# Phase 14 — Regression Fix Report

**Date:** 2026-06-03  
**Scope:** Pre-flight bugfixes only (no new features, no billing/Stripe changes)  
**Status:** Regressions addressed — safe to proceed with production hardening after review

---

## Executive summary

Two production-blocking regressions were fixed:

1. **Dashboard** — `PGRST205` on `agency_tasks` plus unhandled 500/empty API responses crashed `DashboardCommunications`.
2. **Clients** — `ReferenceError: useAuthStore is not defined` in `ClientsPage.tsx`.

Phase 13 tables exist in Postgres and the migration is recorded. PostgREST schema cache was reloaded. API and UI now degrade gracefully instead of crashing.

---

## Bug #1 — Dashboard

### Symptoms

- `PGRST205`: Could not find table `public.agency_tasks`
- `GET /api/dashboard/summary` → 500
- `DashboardCommunications.tsx` called `fetch(...).then(r => r.json())` on error responses → runtime crash

### Root cause

| Layer | Cause |
|-------|--------|
| Database | Phase 13 migration **was applied** — `agency_tasks` and `user_notification_preferences` exist in Postgres (`schema_migrations` includes `20260605100000_phase13_notifications_comms.sql`). |
| PostgREST | Stale schema cache returned `PGRST205` even though the table existed (`node scripts/phase14-verify-phase13-tables.mjs`). |
| API | Unhandled task query errors could abort the route with a non-JSON or empty body. |
| Frontend | No `response.ok` check; JSON parse on HTML/empty 500 bodies. |

### Verification (remote DB)

```
node scripts/phase14-verify-phase13-tables.mjs
→ agency_tasks EXISTS
→ user_notification_preferences EXISTS
→ phase13 migrations: [ 20260605100000_phase13_notifications_comms.sql ]

node scripts/phase14-reload-postgrest.mjs
→ PostgREST schema reload notified
```

### Fixes

| File | Change |
|------|--------|
| `src/app/api/dashboard/summary/route.ts` | Full try/catch; always JSON body; `{ success: false, error, summary: EMPTY_SUMMARY }` on failure; `safeTasks()` swallows missing-table errors; partial success with `warnings` when secondary queries fail. |
| `src/features/dashboard/components/DashboardCommunications.tsx` | Safe fetch (`text` → `JSON.parse`); checks `res.ok` / `success`; empty state + amber banner on error; uses `useRequireWorkspace()` for slug. |
| `src/lib/tasks/task.service.ts` | `listForUser` / `listOpen` return `[]` on `PGRST205` / missing table errors. |
| `src/features/approvals/components/dashboard/approval-widgets.tsx` | Same safe-parse pattern for `/api/approvals/widgets`. |

### API check (Bearer token, agency owner)

After PostgREST reload:

- Status: **200**
- Body: `{ success: true, summary: { ... } }`
- Never returns an empty body on failure

---

## Bug #2 — Clients page

### Symptoms

```
ReferenceError: useAuthStore is not defined
at ClientsPage.tsx line 117
```

### Root cause

`ClientsPage.tsx` referenced `useAuthStore((s) => s.activeWorkspace)` without importing `useAuthStore`. The value was unused; the page already relies on `useRequireWorkspace()` for workspace slug.

### Fix

**File:** `src/features/clients/components/ClientsPage.tsx`

- Removed erroneous `useAuthStore` usage.
- Kept `const { slug: currentSlug } = useRequireWorkspace()`.

### Repo-wide regression scan

Searched for `useAuthStore`, `activeWorkspace`, `currentWorkspace`, `agencyId`, `workspaceSlug` usage without imports.

- **No other files** had `useAuthStore(` without a corresponding `import` from `@/store/authStore` (or `@/features/auth/store/authStore`).
- Only `ClientsPage.tsx` had the missing-import regression.

---

## Browser audit results

**Script:** `scripts/phase14-regression-audit.mjs`  
**Base URL:** `http://localhost:3001`  
**Workspace:** `avc-migration-live`

### API (authenticated owner token)

| Check | Result |
|-------|--------|
| `GET /api/dashboard/summary` | **200**, `success: true`, non-empty JSON body |
| Failure shape | `{ success: false, error, summary: EMPTY_SUMMARY }` — never empty body |

### Route availability (after dev restart)

Unauthenticated probe after clearing `.next` and restarting `npm run dev:3001`:

- `GET /workspace/avc-migration-live/dashboard` → **200** (route registered; was **404** while stale dev cache was active)

### Automated UI audit

| Run | Login | Outcome |
|-----|-------|---------|
| Magic link (2026-06-03) | Agency owner | All 7 routes **PASS**, no `useAuthStore` ReferenceError (exit 0) |
| Password / stale cache | Form login or corrupted `.next` | Redirect to `/onboarding` or global 404 screenshots — **environment**, not regression code |

**Console (target bugs):** `useAuthStore is not defined` — **eliminated** on `ClientsPage` after fix.

**Automation note:** `useRequireWorkspace()` redirects to `/onboarding` when `activeWorkspace` is not yet hydrated. Use magic-link login for audits (`scripts/lib/puppeteer-magic-login.mjs`), or log in manually and navigate to `/workspace/{slug}/dashboard`.

Latest machine-readable output: `docs/verification-screenshots/phase14-regression-report.json`

### Screenshots

| # | File | Route |
|---|------|-------|
| 1 | `docs/verification-screenshots/phase14/01-dashboard.png` | Dashboard |
| 2 | `docs/verification-screenshots/phase14/02-clients.png` | Clients |
| 3 | `docs/verification-screenshots/phase14/03-approvals.png` | Approvals |
| 4 | `docs/verification-screenshots/phase14/04-agreements.png` | Agreements |
| 5 | `docs/verification-screenshots/phase14/05-send-document.png` | Send document |
| 6 | `docs/verification-screenshots/phase14/06-templates.png` | Templates |
| 7 | `docs/verification-screenshots/phase14/07-reports.png` | Reports |

Machine-readable report: `docs/verification-screenshots/phase14-regression-report.json`

---

## Scripts added

| Script | Purpose |
|--------|---------|
| `scripts/phase14-verify-phase13-tables.mjs` | Confirms Phase 13 tables + migration row |
| `scripts/phase14-reload-postgrest.mjs` | `pg_notify('pgrst', 'reload schema')` |
| `scripts/phase14-regression-audit.mjs` | Browser + API regression audit |

---

## How to re-verify

```bash
node scripts/phase14-verify-phase13-tables.mjs
node scripts/phase14-reload-postgrest.mjs
node scripts/phase14-regression-audit.mjs http://localhost:3001 avc-migration-live
```

---

## Out of scope (unchanged)

- No new features
- No Stripe/billing changes
- Production hardening (Phase 14 main work) — **blocked until this report is accepted**

---

## Sign-off

| Check | Status |
|-------|--------|
| Phase 13 tables in DB | OK |
| PostgREST reload | Done |
| Dashboard API hardened | OK |
| DashboardCommunications safe fetch | OK |
| ClientsPage ReferenceError | Fixed |
| Dashboard API `success: true` | OK |
| Clients ReferenceError fixed | OK |
| UI audit (magic link) | PASS when session hydrates workspace |
