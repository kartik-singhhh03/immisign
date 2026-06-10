# INT-1 — Infrastructure Recovery & Production Validation

**Phase:** INT-1  
**Date:** 2026-06-10  
**Overall verdict:** **FAIL** (infrastructure code delivered; live verification incomplete)

---

## What was built

| Part | Deliverable | Status |
|------|-------------|--------|
| 1 | `/workspace/{agency}/admin/system-health` (Owner/Admin) | **IMPLEMENTED** |
| 2 | `GET /api/debug/signwell` | **IMPLEMENTED** |
| 3 | `GET /api/debug/resend` | **IMPLEMENTED** |
| 4 | Agreement lifecycle: generate before send + timeline UI | **IMPLEMENTED** |
| 5 | `webhook_events` table + SignWell/Resend logging | **IMPLEMENTED** (migration pending apply) |
| 6 | NTF-1 diagnostics on System Health | **IMPLEMENTED** |
| 7 | `NEXT_PUBLIC_APP_URL` mismatch detection at startup | **IMPLEMENTED** |
| 8 | Production readiness score (weighted real checks) | **IMPLEMENTED** |
| 9 | `scripts/verify-int1-integrations.mjs` | **IMPLEMENTED** |

---

## Live verification results (2026-06-10)

Evidence: `docs/e2e-evidence/int1-verify-results.json`

| Check | Result | Notes |
|-------|--------|-------|
| SignWell API (`X-Api-Key` → `/hooks`) | **PASS** | HTTP 200 |
| Resend API | **PASS** | HTTP 200 |
| `SIGNWELL_API_KEY` | **PASS** | Set in `.env.local` |
| `RESEND_API_KEY` | **PASS** | Set in `.env.local` |
| `SIGNWELL_WEBHOOK_ID` | **FAIL** | **Missing** — subscription exists: `68e25406-9795-48c0-bd4a-c74a0646ea61` |
| `SIGNWELL_WEBHOOK_SECRET` | **FAIL** | Placeholder value — use `SIGNWELL_WEBHOOK_ID` instead |
| `NEXT_PUBLIC_APP_URL` | **WARN** | `http://localhost:3001` vs server `http://localhost:3000` |
| NTF-1 migration | **FAIL** | `notifications.priority/scope/deleted_at`, `activity_events` missing |
| INT-1 `webhook_events` | **FAIL** | Table not applied (run SQL migration) |
| E2E agreement lifecycle | **FAIL** | `b51f2447-…` still `draft`, no PDF — use **Generate PDF** or re-onboard |
| System Health UI | **MANUAL** | Open as Owner/Admin and capture screenshot |
| Browser screenshots | **PENDING** | `docs/int1-screenshots/` |

---

## Environment variables — action required

Run: `node scripts/check-env-keys.mjs`

### Required for full E2E lifecycle

```env
# Add to .env.local:
SIGNWELL_WEBHOOK_ID=68e25406-9795-48c0-bd4a-c74a0646ea61

# Fix port mismatch:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend test mode (until immisign.app domain verified):
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Get webhook list anytime: `node scripts/list-signwell-hooks.mjs`

**Note:** Current SignWell webhook callback points to **ngrok**, not localhost. For local webhook testing either:
- Update SignWell callback to `http://localhost:3000/api/webhooks/signwell` (or ngrok tunnel to :3000), or
- Use ngrok URL consistently in `NEXT_PUBLIC_APP_URL`.

### Apply in Supabase SQL Editor (manual)

1. `supabase/migrations/20260617100000_ntf1_notifications.sql`
2. `supabase/migrations/20260618100000_int1_webhook_events.sql`

`DATABASE_URL` is optional if using SQL Editor.

### Optional

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Secures `/api/cron/notification-digest` |
| `DATABASE_URL` | CLI `supabase db push` |
| `STRIPE_*` | Billing only — skip per your instruction |

---

## Agreement lifecycle fix

**Before:** Onboarding left agreements in `draft`; send API rejected `draft → sent`.

**After:**
- Onboarding auto-calls `DocumentGenerationService.generateDocument()` (`draft → pending`/generated).
- `POST /api/agreements/[id]/generate` for existing drafts.
- Send disabled until PDF exists (`canSendAgreement` + `AgreementLifecycleTimeline`).
- UI shows: Draft → Generated → Sent → Viewed → Signed.

**E2E Test Client** (`b51f2447-7928-4317-84cd-de3d8b78c245`): still draft from prior onboarding — open agreement → **Generate PDF** → then **Request Signature**.

---

## System Health page

URL: `/workspace/ritiklabs/admin/system-health`

Shows (no secrets):
- Supabase, Storage, Resend, SignWell, Notifications, Webhooks, Search, Documents, Cron, Environment
- Last success/failure ping per integration
- Production readiness % (weighted)
- Webhook recent events
- NTF-1 / notification diagnostics panel

Sidebar: **System Health** link (Owner/Admin only).

---

## Re-verification checklist

```bash
# 1. Fix .env.local (see above)
# 2. Apply SQL migrations in Supabase Dashboard
# 3. Restart dev server
npm run dev

# 4. Run probes
node scripts/verify-int1-integrations.mjs http://localhost:3000
node scripts/e2e2-env-check.mjs http://localhost:3000

# 5. Browser
# - System Health page screenshot → docs/int1-screenshots/01-system-health.png
# - E2E client: Generate PDF → Send → SignWell sign
```

---

## Final verdict

| Category | Status |
|----------|--------|
| INT-1 code delivery | **PASS** |
| SignWell API credentials | **PASS** |
| Resend API credentials | **PASS** |
| Webhook configuration | **FAIL** (`SIGNWELL_WEBHOOK_ID` missing; callback URL is ngrok) |
| NTF-1 + INT-1 DB schema | **FAIL** (migrations not applied) |
| APP URL alignment | **WARN** |
| Full lifecycle E2E | **FAIL** (pending generate + send + sign) |

**INT-1 infrastructure audit: FAIL** until migrations applied, webhook ID set, APP URL fixed, and lifecycle re-run with browser/DB/API evidence.
