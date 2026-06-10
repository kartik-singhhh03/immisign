# NTF-1 — Enterprise Notification Center Audit

**Phase:** NTF-1  
**Date:** 2026-06-06  
**Overall status:** PENDING — browser + DB verification required before PASS

---

## Summary

NTF-1 replaces the simple bell dropdown with an enterprise work inbox: notification center page, priority, assignments, due dates, inbox sections, bulk actions, Supabase realtime, email digests, activity timeline, deep links, and per-category preferences.

---

## Deliverables Checklist

| # | Requirement | Code | DB | API | Realtime | Browser | Status |
|---|-------------|------|-----|-----|----------|---------|--------|
| 1 | `/workspace/[agency]/notifications` — 3-column layout | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 2 | Bell → Recent + View All | ✅ | — | ✅ | ⏳ | ⏳ | PENDING |
| 3 | Priority (critical/high/normal/low) + indicators | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 4 | Actionable notifications (title, description, actions) | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 5 | Assignments (`assigned_to_user_id`, scope filters) | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 6 | Due dates (`due_at`) + inbox sections | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 7 | Bulk actions (read/unread/archive/delete) | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 8 | Supabase realtime (no 30s polling) | ✅ | ⏳ | — | ⏳ | ⏳ | PENDING |
| 9 | Email digests (immediate/hourly/daily/weekly) | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 10 | `activity_events` unified audit trail | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 11 | Deep links (`file_source`, `file_id`, `tab`) | ✅ | — | — | — | ⏳ | PENDING |
| 12 | Per-user notification preferences | ✅ | ⏳ | ✅ | — | ⏳ | PENDING |
| 13 | DS-3 charcoal UX (no teal/green) | ✅ | — | — | — | ⏳ | PENDING |

Legend: ✅ implemented · ⏳ not verified · ❌ failed

---

## Migration

**File:** `supabase/migrations/20260617100000_ntf1_notifications.sql`

Adds:
- `notification_priority`, `notification_scope`, `email_digest_frequency` enums
- Columns: `priority`, `scope`, `assigned_to_user_id`, `due_at`, `archived_at`, `deleted_at`, `workflow_category`, `metadata`
- `activity_events` table + RLS
- Extended `create_notification()` RPC
- Realtime publication on `notifications`
- Digest prefs on `user_notification_preferences`

### Apply migration

```bash
node scripts/apply-migration.mjs supabase/migrations/20260617100000_ntf1_notifications.sql
```

Or via Supabase CLI (resolve migration ordering first):

```bash
npx supabase db push --include-all
```

**DB apply attempt (2026-06-06):** Remote pooler connection failed (`ENOTFOUND`). Migration not confirmed applied.

### Post-migration verification SQL

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name IN ('priority','scope','due_at','metadata');

SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_events');
```

---

## Key Files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260617100000_ntf1_notifications.sql` |
| Service | `src/lib/notifications/notification.service.ts` |
| Activity events | `src/lib/notifications/activity-events.service.ts` |
| Query filters | `src/lib/notifications/notification-query.ts` |
| Types | `src/lib/notifications/types.ts` |
| APIs | `src/app/api/notifications/*` |
| Digest cron | `src/app/api/cron/notification-digests/route.ts` |
| Center page | `src/app/workspace/[agency]/notifications/page.tsx` |
| UI | `src/features/notifications/components/*` |
| Bell dropdown | `src/components/notifications/notification-center.tsx` |
| Realtime hook | `src/features/notifications/hooks/useNotificationRealtime.ts` |
| Preferences | `src/features/settings/components/NotificationPreferencesPanel.tsx` |

---

## Browser Verification Plan

**Prerequisite:** Migration applied + dev server running (`npm run dev`).

### 1. Notification Center page

1. Log in to workspace (e.g. `ritiklabs`).
2. Open `/workspace/{slug}/notifications`.
3. Confirm left sidebar filters, center feed, right detail panel.
4. Toggle Feed view ↔ Inbox view (Overdue / Today / Upcoming / Completed).

### 2. Bell dropdown

1. Click bell in header.
2. Confirm header reads **Recent Notifications**.
3. Click **View All → Notification Center**.
4. Confirm navigation to notification center.

### 3. Agreement signed notification

1. Complete agreement signing flow (SignWell webhook or test sign).
2. Confirm notification appears with priority indicator.
3. Confirm **Open** / deep link navigates to correct client matter tab.

### 4. Approval notification

1. Submit or receive client approval.
2. Confirm high-priority amber indicator.
3. Confirm **Review Approval** action works.

### 5. SOS notification

1. Send SOS or acknowledge via portal.
2. Confirm SOS category filter shows item.
3. Confirm high priority on acknowledge.

### 6. Realtime delivery

1. Open app in two tabs (or trigger event from second session).
2. Trigger approval/SOS/file note event.
3. Confirm bell count updates **without page refresh** (≤3s).

### 7. Filters

- Sidebar: Unread, Assigned To Me, Agreements, Approvals, SOS
- Scope: My / Team / System
- Priority: critical, high, normal, low

### 8. Bulk actions

1. Multi-select 2+ notifications.
2. Mark read, mark unread, archive, delete.
3. Confirm feed updates.

### 9. Deep links

Open notification with client context. URL must include:

```
/clients/{id}?file_source=approval&file_id=xyz&tab=approval
```

Confirm correct matter tab — not wrong file.

### 10. Email digest

1. Settings → Notifications → set digest to **Daily**.
2. Trigger several notifications.
3. Call cron (with `x-cron-secret`):

```bash
curl -X POST http://localhost:3000/api/cron/notification-digests \
  -H "x-cron-secret: $CRON_SECRET"
```

4. Confirm single digest email received.

### 11. Activity timeline

1. Select notification in center.
2. Right panel shows **Activity timeline** entries from `activity_events`.

---

## API Smoke Tests

```bash
# List notifications
curl -b cookies.txt "/api/notifications?sidebar=unread&limit=10"

# Bulk mark read
curl -X POST -b cookies.txt -H "Content-Type: application/json" \
  -d '{"ids":["UUID"],"action":"read"}' /api/notifications/bulk

# Activity for client
curl -b cookies.txt "/api/notifications/activity?client_id=UUID"
```

---

## Sign-off Criteria (PASS)

All must be true:

- [ ] Migration applied and columns verified in DB
- [ ] APIs return new fields (`priority`, `scope`, `due_at`, `metadata.actions`)
- [ ] Realtime INSERT received in browser without refresh
- [ ] Agreement / Approval / SOS notifications verified end-to-end
- [ ] Deep links preserve `file_source`, `file_id`, `tab`
- [ ] Digest cron sends batched email for non-immediate frequency
- [ ] DS-3 charcoal palette — no teal/green in notification UI

**Current verdict: PENDING** — code complete, verification blocked on DB connectivity + manual browser pass.

---

END
