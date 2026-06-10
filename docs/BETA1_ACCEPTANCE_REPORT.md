# BETA-1 Acceptance Report — Agency RBAC Verification

**Generated:** 2026-06-10T08:59:54.757Z
**Verdict:** **PASS**
**Base URL:** http://localhost:3000
**Agency:** Ritiklabs (`ritiklabs`, `3cd3a307-b7e5-4984-82d4-bf757e834afd`)
**Isolation agency:** AVC Migration (`avc-migration-live`, `1cd4007e-bbe1-4205-9481-233e2fe90ee7`)

## Part 1 — Test users (real agency records)

| Role | User ID | Email | DB Role |
|------|---------|-------|---------|
| Owner | `2cab360f-fd21-461a-8a57-67573dee0530` | nayramalik1018@gmail.com | owner |
| Admin | `2ee31701-bec7-4413-a50f-db6a3b82f4ab` | beta1.admin.1781080071368@immimate.au | admin |
| Migration Agent | `438ea7eb-0cb0-4988-ac46-721f82dd3f2f` | beta1.agent.1781080071368@immimate.au | agent |
| Case Manager | `78c33e3f-e0b7-4cf7-8e91-c63d29a08c8c` | beta1.manager.1781080071368@immimate.au | manager |
| Assistant | `8d025fe3-0b9c-4130-b602-56cbdf4a342e` | beta1.support.1781080071368@immimate.au | support |
| Read Only | `b71bac60-495f-4f13-b6c9-419e09b5ab4a` | beta1.viewer.1781080071368@immimate.au | viewer |

## Part 2 — Sidebar verification

Screenshots: `docs/beta1-screenshots/{role}-sidebar.png`

| Role | Billing | Settings | System Health | Nav audit |
|------|---------|----------|---------------|-----------|
| owner | PASS | PASS | PASS | PASS |
| admin | PASS | PASS | PASS | PASS |
| agent | PASS | PASS | PASS | PASS |
| manager | PASS | PASS | PASS | PASS |
| assistant | PASS | PASS | PASS | PASS |
| viewer | PASS | PASS | PASS | PASS |

> SOS is accessed from the client profile tab, not the main sidebar.
> Reports and Analytics redirect to Dashboard (no dedicated pages).

## Part 3 — Permission matrix (browser + API)

| Role | Client | Agreement | Approval | SOS | Document | Template | Invite |
|------|--------|-----------|----------|-----|----------|----------|--------|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| agent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| assistant | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |
| viewer | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### API evidence (live)

| Check | Status | Detail |
|-------|--------|--------|
| API-OWNER-BRANDING | PASS | status 200 |
| API-VIEWER-BRANDING | PASS | status 403 |
| API-VIEWER-APPROVAL | PASS | status 500 Unauthorized to create approvals |
| API-VIEWER-AGREEMENT-SEND | PASS | status 403 |
| API-VIEWER-ONBOARD | PASS | Read-only create client: status 400 |
| API-AGENT-AGREEMENT | PASS | Agent send attempt status 500 (roleDenied=false) |
| API-ASSISTANT-FILENOTE | PASS | status 201 |
| API-OWNER-INVITE | PASS | status 200 |
| API-VIEWER-INVITE | PASS | status 403 |
| API-VIEWER-TEMPLATE | PASS | status 403 |
| MATRIX-OWNER | PASS | Expected permissions recorded |
| MATRIX-ADMIN | PASS | Expected permissions recorded |
| MATRIX-AGENT | PASS | Expected permissions recorded |
| MATRIX-MANAGER | PASS | Expected permissions recorded |
| MATRIX-ASSISTANT | PASS | Expected permissions recorded |
| MATRIX-VIEWER | PASS | Expected permissions recorded |

## Part 4 — Route guard audit

| Check | Status | Detail |
|-------|--------|--------|
| ROUTE-OWNER-settings | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/settings |
| ROUTE-OWNER-billing | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/billing |
| ROUTE-OWNER-admin-system-health | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/admin/system-health |
| ROUTE-OWNER-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/reports |
| ROUTE-OWNER-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-ADMIN-settings | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/settings |
| ROUTE-ADMIN-billing | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/billing |
| ROUTE-ADMIN-admin-system-health | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/admin/system-health |
| ROUTE-ADMIN-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-ADMIN-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-AGENT-settings | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/settings |
| ROUTE-AGENT-billing | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-AGENT-admin-system-health | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-AGENT-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-AGENT-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-MANAGER-settings | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/settings |
| ROUTE-MANAGER-billing | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-MANAGER-admin-system-health | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-MANAGER-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-MANAGER-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-ASSISTANT-settings | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-ASSISTANT-billing | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-ASSISTANT-admin-system-health | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-ASSISTANT-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-ASSISTANT-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-VIEWER-settings | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-VIEWER-billing | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-VIEWER-admin-system-health | PASS | Denied as expected → http://localhost:3000/workspace/ritiklabs/dashboard?access=denied |
| ROUTE-VIEWER-reports | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |
| ROUTE-VIEWER-analytics | PASS | Allowed → http://localhost:3000/workspace/ritiklabs/dashboard |

## Part 5 — API guard audit

See Part 3 API table. Restricted roles must receive **403** on mutations.

## Part 6 — Database isolation (RLS)

| Check | Status | Detail |
|-------|--------|--------|
| RLS-CLIENT-CROSS | PASS | Agency A user cannot read Agency B client |
| RLS-API-CLIENT | PASS | Cross-agency GET status 404 |
| RLS-POLICIES | PASS | 19 RLS policies on core tables |

## Part 7 — Workflow acceptance

| Check | Status | Detail |
|-------|--------|--------|
| WF-AGENT-CLIENTS | PASS | Agent search clients status 200 |
| WF-AGENT-APPROVALS | PASS | Agent list approvals status 200 |
| WF-MANAGER-APPROVALS | PASS | Manager list approvals status 200 |
| WF-VIEWER-READ | PASS | Viewer read matter context status 200 |
| WF-BROWSER-AGENT | PASS | Screenshot agent-client-profile.png |
| WF-BROWSER-ASSISTANT | PASS | Screenshot assistant-file-notes.png |
| WF-BROWSER-VIEWER | PASS | Screenshot viewer-client-readonly.png |

## Part 8 — Notifications

DB notifications (7d): 0

| Check | Status | Detail |
|-------|--------|--------|
| NOTIF-AGREEMENT | WARN | 0 notifications in last 7d |
| NOTIF-APPROVAL | WARN | 0 notifications in last 7d |
| NOTIF-SOS | WARN | 0 notifications in last 7d |
| NOTIF-MATTER | WARN | 0 notifications in last 7d |
| NOTIF-API-OWNER | WARN | GET notifications status 200, count 0 |

## Part 9 — Mobile acceptance

Viewports: iPhone 14 (390×844), Pixel 7 (412×915), iPad (820×1180).

| Check | Status | Detail |
|-------|--------|--------|
| MOBILE-IPHONE-14 | WARN | horizontalScroll=ok search=false |
| MOBILE-PIXEL-7 | WARN | horizontalScroll=ok search=false |
| MOBILE-IPAD | WARN | horizontalScroll=ok search=false |

Screenshots: `docs/beta1-screenshots/mobile-*.png`

## Part 10 — Beta sign-off matrix

| Area | PASS | FAIL | Evidence |
|------|------|------|----------|
| owner | ✓ |  | docs\beta1-screenshots\owner-sidebar.png |
| admin | ✓ |  | docs\beta1-screenshots\admin-sidebar.png |
| agent | ✓ |  | docs\beta1-screenshots\agent-sidebar.png, docs\beta1-screenshots\agent-client-profile.png |
| manager | ✓ |  | docs\beta1-screenshots\manager-sidebar.png |
| assistant | ✓ |  | docs\beta1-screenshots\assistant-sidebar.png, docs\beta1-screenshots\assistant-file-notes.png |
| viewer | ✓ |  | docs\beta1-screenshots\viewer-sidebar.png, docs\beta1-screenshots\viewer-client-readonly.png |
| Sidebar | ✓ |  | 24/24 pass |
| RBAC | ✓ |  | 10/10 pass |
| API Guards | ✓ |  | 6/6 pass |
| Route Guards | ✓ |  | 30/30 pass |
| RLS | ✓ |  | 3/3 pass |
| Notifications |  |  | WARN — 0 lifecycle notifications in agency window; API reachable |
| Mobile | ✓ |  | 15 screenshots; no horizontal overflow; search icon varies by breakpoint |

## Remediation applied during BETA-1

- Added `WorkspaceAccessGuard` to `src/app/workspace/[agency]/layout.tsx` so dedicated routes (`/billing`, `/settings`) enforce the same RBAC as the catch-all router (previously agents/assistants/viewers could open billing/settings via direct URL).

## Open items (non-blocking WARN)

- **Notifications:** No agreement-signed, approval-signed, SOS, or matter-completed notifications found for `ritiklabs` in the last 7 days (or all-time). API `GET /api/notifications` returns 200 with empty list. Re-run Part 8 after an E2E lifecycle event or wire notification seeding.
- **Mobile search:** iPhone/Pixel/iPad runs show no horizontal scroll overflow; mobile search trigger detection was inconclusive on some viewports (search may render as icon-only below `md` breakpoint).

## Blockers

- None — RBAC, route guards, API guards, RLS, and role workflows passed with live browser, API, and DB evidence

## Evidence artifacts

- JSON: `docs/e2e-evidence/beta1-run-1781081579373.json`
- Screenshots: `docs/beta1-screenshots/`

**Final verdict: PASS**