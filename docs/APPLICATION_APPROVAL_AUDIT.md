# APPLICATION-APPROVAL-REBUILD-1 — Pre-Implementation Audit

**Date:** 2026-06-14  
**Product:** ImmiMate  
**Scope:** Audit before rebuild (no agreement bug fixes)

---

## Executive Summary

The current Application Approval module is an **internal workflow/task system** (title, priority, due dates, reviewers, checklist, state machine with 12+ transitions). Rajwant Sir requires a **simple client sign-off flow**: select client+matter → upload PDF → message → preview → email → token-based client approval.

---

## Current Routes

### Workspace (active)
| Route | File |
|-------|------|
| `/workspace/[agency]/approvals` | `src/app/workspace/[agency]/approvals/page.tsx` |
| `/workspace/[agency]/approvals/new` | `src/app/workspace/[agency]/approvals/new/page.tsx` |
| `/workspace/[agency]/approvals/[id]` | `src/app/workspace/[agency]/approvals/[id]/page.tsx` |

### Legacy (remove/redirect)
| Route | File |
|-------|------|
| `/application-approvals` | `src/app/(dashboard)/application-approvals/*` |
| `/workspace/[agency]/application-approvals/*` | Redirect in catch-all |

### Public client (replace)
| Route | File | Issue |
|-------|------|-------|
| `/review/[token]` | `src/app/review/[token]/page.tsx` | SignWell-centric, wrong UX |
| `/client/review/[token]` | Redirect to `/review` | — |

### Target public route
| Route | Purpose |
|-------|---------|
| `/approval/[token]` | New client portal (no login) |

---

## Current API Endpoints (to simplify/remove)

| Endpoint | Action |
|----------|--------|
| `GET/POST /api/approvals` | **Rewrite** — list/create draft only |
| `GET/PATCH /api/approvals/[id]` | **Rewrite** — draft fields only |
| `POST .../transition` | **Remove** — internal workflow |
| `POST .../comments` | **Remove** |
| `PATCH .../checklist` | **Remove** |
| `POST .../attachments` | **Merge** into upload step |
| `POST .../send-for-client-approval` | **Replace** with Resend email send |
| `GET/POST .../certificate` | **Remove** from MVP (optional later) |
| `GET /api/approvals/widgets` | **Update** counts for new statuses |

---

## Database

### Primary table: `application_approvals`
**Keep table**, rebuild columns via migration:
- **Remove from UI/logic:** title (auto), priority, lodgement_deadline, assigned_reviewer_id, internal workflow statuses
- **Add:** matter_id, application_file_*, message_*, approval_token, token_expires_at, viewed_at, changes_requested_at, client_name_confirmed, client_ip, client_user_agent, change_request_reason

### Related tables to deprecate (stop using)
- `approval_comments` (internal)
- `approval_checklist_items`
- `approval_attachments` (replace with file columns on main table)

### Legacy unused
- `public.approvals` — never referenced, can drop later

### Matters
- `public.matters` — use for `matter_id` FK (resolve/create on client+matter select)

---

## Storage

| Current | Target |
|---------|--------|
| `documents` bucket `{agencyId}/approvals/{id}/...` | **`application-approvals`** bucket `{agencyId}/{matterId}/{filename}` |
| Public URLs | **Never** — signed URLs only |

---

## Email / Notifications

| Current | Target |
|---------|--------|
| SignWell for client signing | **Resend** with review link |
| `sendForClientApproval()` | New template with `/approval/{token}` |
| `email_delivery_audit` | Log every send |
| `activity_logs` + `NotificationService` | Keep for agent notifications |

---

## Sidebar / Nav

| Item | Action |
|------|--------|
| App Approvals | **Keep** — rebuild UI |
| Templates | **Remove from sidebar** (Agreements still use templates API internally) |

---

## Dashboard

| Component | Status |
|-----------|--------|
| `ApprovalDashboardWidgets` | Exists but **not mounted** — wire to compliance dashboard |
| `/api/approvals/widgets` | Update for sent/viewed/approved/changes_requested |

---

## Safe to Delete (post-rebuild)

- `src/components/saas/application-approvals/*`
- `src/components/approvals/ApprovalList.tsx`
- `src/app/(dashboard)/application-approvals/*`
- `src/services/approvals/*` (stub layer)
- Old wizard fields in `approval-wizard.tsx` (replace entirely)
- Internal transition UI in `approval-detail-page.tsx`

---

## Do NOT Touch (this phase)

- **Agreement wizard draft jump bug** — document only
- Templates API / agreement generation (sidebar removal only)
- SignWell for **service agreements** (separate module)

---

## Known Agreement Bug (documented, not fixed)

**Bug:** New Agreement detects existing draft and jumps to Send step.  
**Expected:** Always start at Step 1 Client.  
**Fix:** After Application Approval rebuild is browser-verified.
