# Phase 13 — Notifications, Emails & Communications: Implementation Report

**Date:** 2026-06-03  
**Status:** Implemented  
**Constraints honoured:** No billing/Stripe changes; no approval workflow redesign; no duplicate notification systems

---

## Summary

Phase 13 turns ImmiSign into a more complete SaaS experience by wiring the existing `notifications` and `activity_logs` tables into a unified **NotificationService**, adding **user preferences**, **email delivery via Resend**, a **global notification center**, **activity feed**, **tasks**, **global search (Ctrl+K)**, **dashboard communications widgets**, and **deadline reminders**.

---

## Database

**Migration:** `supabase/migrations/20260605100000_phase13_notifications_comms.sql`

| Addition | Description |
|----------|-------------|
| `notifications` columns | `entity_type`, `entity_id`, `actor_id` |
| Enum values | `document`, `comment`, `checklist`, `task` |
| `user_notification_preferences` | Per-user email/in-app controls |
| `agency_tasks` | Lightweight task system |
| `create_notification()` RPC | Secure tenant-scoped inserts |
| Approval reminder fields | `reminder_at`, `escalation_at`, `reminders_sent` |

**Apply:** `node scripts/phase13-apply-migration.mjs`

---

## Core services

| Service | Path |
|---------|------|
| NotificationService | `src/lib/notifications/notification.service.ts` |
| Preferences helpers | `src/lib/notifications/preferences.ts` |
| Mention parsing | `src/lib/notifications/mentions.ts` |
| Transactional email | `src/lib/email/transactional.ts` |
| TaskService | `src/lib/tasks/task.service.ts` |
| Workspace API context | `src/lib/auth/workspace-api.ts` |

---

## Part 1 — Global notification center

- `NotificationCenter` component in header (`dashboard-shell.tsx`)
- Unread badge via `/api/notifications/unread` (30s refresh)
- Drawer: filter by type, mark read, mark all read, deep links via `action_url`
- Pagination via `GET /api/notifications?page&limit&type`

---

## Part 2 — Email notifications

Approval workflow emails wired through `notifyApprovalUser` → `NotificationService` (respects preferences).

Also wired:

- Agreement sent (`/api/agreements/standard`)
- Document sent (`/api/documents/send`)
- Document signed (SignWell webhook `document_completed`)
- Team member joined (`/api/auth/accept-invite`)
- Deadline reminders (`/api/cron/deadline-reminders`)

---

## Part 3 — User notification preferences

- Settings → **Notifications** (`NotificationPreferencesPanel`)
- `GET/PATCH /api/settings/notification-preferences`
- Applied in `NotificationService.notify()` before in-app insert and Resend send

---

## Part 4 — Activity feed

- `GET /api/activity` — pagination, search, agency-scoped
- Page: `/workspace/[agency]/activity` (`ActivityFeedPage`)
- Dashboard excerpt via `DashboardCommunications`

---

## Part 5 — Tasks & assignments

- Table `agency_tasks`
- Auto-task on approval reviewer assign
- `GET/POST /api/tasks`, `PATCH /api/tasks/[id]`
- Task assign → in-app notification

---

## Part 6 — Dashboard enhancements

`GET /api/dashboard/summary` + `DashboardCommunications`:

- My tasks  
- My reviews  
- Pending signatures  
- Recent notifications  
- Recent activity  
- Upcoming deadlines (7 days)  
- Overdue approvals  

All counts from live queries (no placeholders).

---

## Part 7 — Deadlines & reminders

- Cron endpoint `POST /api/cron/deadline-reminders`
- Stages: 7d, 3d, 1d, overdue (tracked in `reminders_sent` JSONB)
- In-app + email notifications to creator and assigned reviewer

---

## Part 8 — Comment mentions

- `@handle` parsed in `ApprovalService.addComment`
- Notifications to mentioned users (category `comment`)

---

## Part 9 — Global search

- `GET /api/search?q=` — clients, agreements, approvals, documents, users, tasks
- `CommandPalette` debounced search + Ctrl+K

---

## Files not modified

- `src/app/api/stripe/**`
- Billing pages and subscription migrations
- Approval state machine / status enum

---

## Verification

```bash
node scripts/phase13-apply-migration.mjs
npm run dev:3001
node scripts/phase13-browser-audit.mjs http://localhost:3001 avc-migration-live
```

See [PHASE13_VERIFICATION_REPORT.md](PHASE13_VERIFICATION_REPORT.md).

---

*End of Phase 13 implementation report.*
