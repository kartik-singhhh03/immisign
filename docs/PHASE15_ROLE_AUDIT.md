# Phase 15 — Role Security Audit

**Date:** 2026-06-03  
**Roles:** Owner, Admin, Manager (Case Manager), Agent (Migration Agent), Assistant (support), Read-only Staff (viewer/reviewer)

Sources: `src/lib/auth/db-roles.ts`, `src/lib/auth/route-access.ts`, `src/lib/permissions/approval-actions.ts`, `dashboard-shell.tsx`, RLS migrations.

---

## UI access matrix (workspace routes)

| Feature | Owner | Admin | Manager | Agent | Assistant | Read-only |
|---------|-------|-------|---------|-------|-----------|-----------|
| Dashboard | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Clients | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Agreements | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Approvals | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Send document | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Templates | Allowed | Allowed | Allowed | Allowed | Denied (new) | Allowed |
| Reports | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Analytics | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Settings | Allowed | Allowed | Allowed | Allowed | **Denied** | **Denied** |
| Billing | Allowed | Allowed | **Denied** | **Denied** | **Denied** | **Denied** |
| Settings → Team | Allowed | Allowed | Denied | Denied | Denied | Denied |
| Settings → Payment schedules | **Owner only** | Denied | Denied | Denied | Denied | Denied |

Enforcement: `canAccessWorkspacePath()` + nav lock in `dashboard-shell.tsx`.

---

## API access matrix

| API area | Owner | Admin | Manager | Agent | Assistant | Read-only |
|----------|-------|-------|---------|-------|-----------|-----------|
| Dashboard / search / activity | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Notifications / tasks | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |
| Approvals — create | Allowed | Allowed | Allowed | Allowed | Denied | Denied |
| Approvals — view all | Allowed | Allowed | Allowed | Scoped | Scoped | Allowed |
| Approvals — approve/reject | Allowed | Allowed | Allowed | Denied | Denied | Denied |
| Approvals — lodge/close | **Owner** | Denied | Denied | Denied | Denied | Denied |
| Billing (`/api/stripe/*`) | Allowed | Allowed | Denied | Denied | Denied | Denied |
| Team invite | Allowed | Allowed | Denied | Denied | Denied | Denied |
| Template write | Allowed | Allowed | Allowed | Allowed | Denied | Denied |

Enforcement: `ApprovalService` + `canPerformApprovalAction`, `guards` in `api-auth.ts`, `forbidUnless` on billing routes.

---

## RLS matrix (Postgres)

Tenant isolation via `agency_id = public.get_tenant()` on:

- `clients`, `templates`, `agreements`, `documents`, `users`
- `application_approvals`, `notifications`, `agency_tasks`, `activity_logs`
- `user_notification_preferences`

| Check | Result |
|-------|--------|
| RLS enabled on core tables | **PASS** (Phase 15 DB audit) |
| Orphan clients/agreements | **0** |
| Users without agency | **0** |

Approval row-level rules also enforced in **application layer** (`canViewApproval` scopes agent/support to assigned/created records).

---

## Approval actions detail

| Action | Owner | Admin | Manager | Agent | Assistant | Read-only |
|--------|-------|-------|---------|-------|-----------|-----------|
| Submit / resubmit | Allowed | Allowed | Allowed | Own drafts | Denied | Denied |
| Review / request changes | Allowed | Allowed | Allowed | If reviewer | Denied | Denied |
| Approve / reject | Allowed | Allowed | Allowed | Denied | Denied | Denied |
| Ready to lodge / lodged / close | Allowed | Denied | Denied | Denied | Denied | Denied |
| Assign reviewer | Allowed | Allowed | Allowed | Denied | Denied | Denied |

---

## Gaps (document only — no new features)

| Gap | Severity |
|-----|----------|
| UI does not hide Approvals create button for read-only (API denies) | Low |
| Direct URL to `/billing` may load page shell before redirect | Low — nav locked |

---

## Result

**PASS** — Role model is consistent across UI guards, API services, and RLS tenant isolation.
