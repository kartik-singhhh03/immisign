# Phase 15 — API Audit

**Date:** 2026-06-03  
**Static script:** `scripts/phase15-api-static-audit.mjs`  
**Smoke script:** `scripts/phase15-smoke-e2e.mjs`  
**Evidence:** `docs/verification-screenshots/phase15-api-static-audit.json`, `phase15-smoke-e2e.json`

---

## Requirements (launch standard)

Every production API must:

- Return **JSON** (never HTML, never empty body on error)
- Use **try/catch** or `withApiRoute()` wrapper
- Return correct **HTTP status** (401/403/400/500)
- **Log** failures (`console.error` via `apiError` / `withApiRoute`)

Shared helper added: `src/lib/api/json-response.ts` (`apiError`, `withApiRoute`, `apiJson`).

---

## Smoke test results (owner token)

| Endpoint | Status | JSON body | Notes |
|----------|--------|-----------|-------|
| `GET /api/dashboard/summary` | 200 | Yes | `success: true` |
| `GET /api/notifications` | 200 | Yes | |
| `GET /api/notifications/unread` | 200 | Yes | Hardened Phase 15 |
| `GET /api/activity` | 200 | Yes | |
| `GET /api/search` | 200 | Yes | |
| `GET /api/approvals` | 200 | Yes | |
| `GET /api/approvals/widgets` | 200 | Yes | |
| `GET /api/tasks` | 200 | Yes | |
| `POST /api/tasks` | 200 | Yes | Create + complete |
| `GET /api/approvals/[id]` | 200 | Yes | |
| `GET /api/settings/notification-preferences` | 200 | Yes | |
| `GET /api/stripe/billing` | 500 | Yes | Stripe not configured in local env |
| `POST /api/stripe/checkout` | 500 | Yes | Returns JSON error |
| `POST /api/stripe/portal` | 500 | Yes | Returns JSON error |

---

## Static audit summary

| Status | Count | Meaning |
|--------|-------|---------|
| OK | 17 | try/catch or `withApiRoute`, JSON responses |
| WARN | 15 | Has try/catch via `handleServerError` but no explicit route label logging |
| GAP | 4 remaining | Missing `withApiRoute` (see below) |

### Hardened in Phase 15

- `/api/notifications`, `/api/notifications/unread`, `/api/notifications/read-all`, `/api/notifications/[id]`
- `/api/tasks`, `/api/tasks/[id]`
- `/api/search`, `/api/activity`
- `/api/approvals`, `/api/approvals/widgets`
- `/api/dashboard/summary` (Phase 14)

### Remaining GAP routes (medium — wrap with `withApiRoute` post-launch)

| Route | Risk |
|-------|------|
| `/api/agreements/wizard-draft` | Unhandled throw → possible 500 HTML |
| `/api/documents/wizard-draft` | Same |
| `/api/settings/branding/logo` | Same |
| `/api/team/invite/[token]` | Public invite read |

(17 routes now **OK** after Phase 15 hardening of notifications, tasks, settings prefs, approvals.)

These routes already return `NextResponse.json` on auth failures; GAP is missing top-level catch for unexpected throws.

---

## Namespace coverage

| Prefix | Audited | Auth pattern |
|--------|---------|--------------|
| `/api/agreements/*` | Yes | Session + agency |
| `/api/documents/*` | Yes | Session + agency |
| `/api/approvals/*` | Yes | `getApprovalApiContext` + role checks |
| `/api/tasks/*` | Yes | `getWorkspaceApiContext` |
| `/api/notifications/*` | Yes | `getWorkspaceApiContext` |
| `/api/search` | Yes | Workspace context |
| `/api/dashboard/*` | Yes | Workspace context |
| `/api/settings/*` | Yes | Workspace / session |
| `/api/stripe/*` | Yes | `requireAgency` + owner/admin |
| `/api/team/*` | Yes | Session + guards |

Webhooks (`/api/webhooks/*`) excluded from JSON smoke — raw body + signature verification.

---

## Result

**PASS with conditions** — Core workspace APIs return JSON and pass smoke tests. Stripe billing requires production `STRIPE_*` keys (documented in `docs/STRIPE_SETUP_GUIDE.md`).
