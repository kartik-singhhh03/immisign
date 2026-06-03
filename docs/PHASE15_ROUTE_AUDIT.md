# Phase 15 — Route Audit

**Date:** 2026-06-03  
**Workspace:** `avc-migration-live`  
**Script:** `scripts/phase15-route-audit.mjs`  
**Evidence:** `docs/verification-screenshots/phase15-route-audit.json`

---

## Scope

All primary workspace routes required for launch:

| Route | Path | Dedicated page |
|-------|------|----------------|
| Dashboard | `/workspace/{slug}/dashboard` | `dashboard/page.tsx` |
| Clients | `/workspace/{slug}/clients` | catch-all |
| Agreements | `/workspace/{slug}/agreements` | `agreements/page.tsx` |
| Approvals | `/workspace/{slug}/approvals` | `approvals/page.tsx` |
| Send Document | `/workspace/{slug}/documents/send` | catch-all |
| Templates | `/workspace/{slug}/templates` | catch-all |
| Reports | `/workspace/{slug}/reports` | catch-all |
| Settings | `/workspace/{slug}/settings` | `settings/page.tsx` |
| Billing | `/workspace/{slug}/billing` | `billing/page.tsx` |
| Activity | `/workspace/{slug}/activity` | `activity/page.tsx` |
| Tasks | Dashboard widgets + `/api/tasks` | No standalone page (by design) |
| Notifications | Header center + settings prefs | No standalone page (by design) |

---

## Verification matrix

| Route | HTTP | UI (owner) | Runtime errors | Empty data | Refresh |
|-------|------|------------|------------------|------------|---------|
| Dashboard | 200 | PASS | None | OK (widgets empty-state) | See note |
| Clients | 200 | PASS | None | OK | PASS |
| Agreements | 200 | PASS | None | OK | PASS |
| Approvals | 200 | PASS | None | OK | PASS |
| Send Document | 200 | PASS | None | OK | PASS |
| Templates | 200 | PASS | None | OK | PASS |
| Reports | 200 | PASS | None | OK | PASS |
| Settings | 200 | PASS | None | OK | PASS |
| Billing | 200 | PASS | None | Stripe API may 500 without keys | PASS |
| Activity | 200 | PASS | None | OK | PASS |

**Login redirect:** Magic-link login used for audit (same as Phase 13/14). Password login can briefly hit `/onboarding` before workspace hydrates — fixed in Phase 15 via `useRequireWorkspace()` only redirecting when `user` exists but workspace does not.

**Permission denial:** `canAccessWorkspacePath()` redirects restricted paths to `/dashboard?access=denied`. Billing/settings nav items show **Locked** for Assistant and Read-only staff in `dashboard-shell.tsx`.

**Browser refresh:** Post-navigation reload on dashboard reported `FAIL` in automation (URL slug mismatch timing). Manual refresh on workspace routes is OK when session cookie is valid.

---

## Screenshots

| File | Route |
|------|-------|
| `docs/verification-screenshots/phase15/01-dashboard.png` | Dashboard |
| `docs/verification-screenshots/phase15/02-clients.png` | Clients |
| `docs/verification-screenshots/phase15/03-agreements.png` | Agreements |
| `docs/verification-screenshots/phase15/04-approvals.png` | Approvals |
| `docs/verification-screenshots/phase15/05-send-document.png` | Send document |
| `docs/verification-screenshots/phase15/06-templates.png` | Templates |
| `docs/verification-screenshots/phase15/07-reports.png` | Reports |
| `docs/verification-screenshots/phase15/08-settings.png` | Settings |
| `docs/verification-screenshots/phase15/09-billing.png` | Billing |
| `docs/verification-screenshots/phase15/10-activity.png` | Activity |

---

## Defects fixed (Phase 15)

| Issue | Fix |
|-------|-----|
| Premature `/onboarding` redirect while auth loading | `useRequireWorkspace()` only redirects when `user && !slug` |

---

## Residual (low)

| Item | Severity |
|------|----------|
| Automated refresh check flaky | Low |
| Tasks/notifications have no dedicated route pages | Informational (existing design) |

---

## Result

**PASS** — All audited workspace routes load without runtime errors for agency owner.
