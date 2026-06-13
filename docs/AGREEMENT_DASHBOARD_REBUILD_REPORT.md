# Agreement & Dashboard Rebuild Report

**Task:** AGREEMENT-DASHBOARD-REBUILD-1  
**Date:** 2026-06-14  
**Status:** IMPLEMENTED — browser E2E pending full run

## Part 1 — Agreement wizard draft jump (FIXED)

**Root cause:** `/agreements/new` always restored `agreement_wizard_drafts.current_step`, including step 5 (Send).

**Fix:**
- **New Agreement** → clears wizard draft, always starts Step 1 (`Client`)
- **Continue draft** → `/agreements/new?resume=1` restores saved step (capped at Preview / step 4 — never auto-Send)
- Draft banner on agreements list links to `?resume=1`

**Verify:**
1. Click **New Agreement** → must land on Step 1
2. Progress to Step 2, leave, click **Continue draft** → must return Step 2
3. Never auto-jump to Send on new agreement

## Part 2 — Send step animation (FIXED)

- Removed full-screen `withGlobalTask` overlay (was hiding inline timeline)
- Stages animate sequentially via `animateTimelineCompletion()` (~180ms per stage)
- Framer Motion transitions: timeline → success card (no jerk)
- `DispatchTimeline` items fade/slide in per stage

## Part 3 — Agreement dashboard widgets

- API: `GET /api/agreements/widgets`
- Component: `AgreementDashboardWidgets`
- Counts: Pending, Sent, Awaiting Signature, Signed (real DB)
- Click → filters agreements list

## Part 4 — Agreement list

- Columns: Reference, Client, Matter, Status, Sent Date, Signed Date, Actions
- Widgets + draft resume banner
- Server pagination unchanged (`.range()` + `count: 'exact'`)
- Actions: View, Send, Download PDF, Open SignWell, Delete Draft

## Part 5 — Agreement detail

- Existing detail page retained (`AgreementDashboard` + lifecycle timeline)
- No scope expansion in this pass

## Part 6 — Dashboard rebuild

- New `AgentDashboardPage` replaces crowded compliance dashboard on `/dashboard`
- Sections: Quick Actions → Today's Work → Pipeline (agreement + approval widgets) → Notifications → Recent Clients
- Removed: revenue cards, compliance summary grid, matter attention queue from home dashboard

## Part 7 — Clutter removal

- Dashboard home simplified per Rajwant feedback
- Templates not in sidebar (unchanged)

## Part 8 — Animations

- Framer Motion on quick actions, send success, dispatch timeline, agreement widgets

## Part 9 — Performance

- Dashboard loads parallel fetches (`/api/dashboard/summary`, widgets APIs)
- Agreements list: server pagination only

## Part 10 — E2E

```bash
node scripts/agreement-dashboard-e2e.mjs http://localhost:3000 ritiklabs
```

Evidence: `docs/e2e-evidence/agreement-dashboard-e2e.json`

**Full browser PASS still required** before closing module (wizard send + SignWell + storage).
