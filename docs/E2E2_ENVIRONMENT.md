# E2E-2 — Environment Stabilization Report

**Phase:** E2E-2 STEP 0  
**Date:** 2026-06-10  
**Probe script:** `scripts/e2e2-env-check.mjs`  
**Evidence:** `docs/e2e-evidence/e2e2-env-check-final.json`

---

## STEP 0 actions performed

| Action | Result |
|--------|--------|
| Kill all Node processes | **DONE** (`Stop-Process -Name node -Force`) |
| Start exactly one dev server | **DONE** (`npm run dev` → `http://localhost:3000`) |
| Verify localhost responds | **PASS** — HTTP 200 |
| Verify Supabase connectivity | **PASS** — REST returned 6 agencies |
| Verify SignWell keys | **FAIL** — API `/me` returned **401** |
| Verify Resend keys | **FAIL** — API `/domains` returned **401** |

**Note:** After restart, Next.js spawns multiple `node` worker processes (normal). Only one `npm run dev` instance is running on port **3000**.

---

## Environment variables

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | SET | REST probe OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SET | |
| `SUPABASE_SERVICE_ROLE_KEY` | SET | Used for DB/API probes |
| `SUPABASE_DB_PASSWORD` | SET | Not sufficient alone for CLI pooler |
| `DATABASE_URL` | **MISSING** | CLI migration apply fails; use Supabase SQL Editor |
| `SIGNWELL_API_KEY` | SET (value present) | **Invalid** — SignWell `/me` → 401 |
| `SIGNWELL_WEBHOOK_ID` | **MISSING** | Required to simulate/verify signed webhooks |
| `SIGNWELL_WEBHOOK_SECRET` | SET | Cannot use without `SIGNWELL_WEBHOOK_ID` |
| `RESEND_API_KEY` | SET (value present) | **Invalid** — Resend `/domains` → 401 |
| `RESEND_FROM_EMAIL` | `support@immisign.app` | Domain **not verified** (per user) — use test sender |
| `STRIPE_SECRET_KEY` | Present in `.env.local` | **Not configured for billing** (per user — skip Stripe) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | **Mismatch** — dev server runs on **3000** |
| `CRON_SECRET` | **MISSING** | Notification digest cron cannot be secured |

---

## Connectivity checks (live probes)

```json
{
  "localhost": { "ok": true, "status": 200 },
  "supabase_rest": { "ok": true, "agencies": 6 },
  "ntf1_migration": {
    "ok": false,
    "error": "column notifications.priority does not exist"
  },
  "activity_events": {
    "ok": false,
    "error": "Could not find the table 'public.activity_events' in the schema cache"
  },
  "signwell_api": { "ok": false, "status": 401 },
  "resend_api": { "ok": false, "status": 401 }
}
```

---

## External platform configuration required

These are **blocking** for full E2E-2 PASS. No code changes will fix missing/invalid credentials.

### 1. Supabase — NTF-1 migration (BLOCKING for Steps 1, 9, 10)

Apply manually in **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/20260617100000_ntf1_notifications.sql
```

Verify after apply:

- `notifications.priority` exists
- `notifications.scope` exists
- `notifications.deleted_at` exists
- `public.activity_events` table exists

CLI apply is blocked: `DATABASE_URL` missing and pooler `ENOTFOUND` from prior runs.

### 2. SignWell (BLOCKING for Step 3)

| Item | Action |
|------|--------|
| `SIGNWELL_API_KEY` | Replace with a valid API key from [SignWell dashboard](https://www.signwell.com). Current key returns **401** on `GET /api/v1/me`. |
| `SIGNWELL_WEBHOOK_ID` | Create webhook endpoint in SignWell pointing to `{APP_URL}/api/webhooks/signwell`. Copy webhook ID into `.env.local`. |
| Webhook events | Enable `document_sent`, `document_viewed`, `document_signed`, `document_completed`. |
| Test mode | Use SignWell test/sandbox if available for non-production sends. |

### 3. Resend — test mode (BLOCKING for email evidence in Steps 3, 4, 6)

Per your instruction: domain verification deferred; use **test mode**.

| Item | Action |
|------|--------|
| `RESEND_API_KEY` | Replace with valid key from [Resend dashboard](https://resend.com). Current key returns **401**. |
| `RESEND_FROM_EMAIL` | Set to `onboarding@resend.dev` until `immisign.app` domain is verified. |
| Recipient | In test mode, emails only deliver to the Resend account owner address. |
| `support@immisign.app` | Will fail until DNS/domain verification completes. |

### 4. Stripe (SKIP per user)

Billing/subscription flows are **out of scope** for E2E-2. No Stripe keys required for lifecycle validation.

### 5. App URL alignment (recommended)

Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` (or production URL) so email deep links and SignWell redirect URLs match the running server.

### 6. CRON_SECRET (optional for E2E-2)

Required only if validating notification digest cron (`/api/cron/notification-digest`). Not blocking core lifecycle.

---

## Re-run probes

```bash
# Environment
node scripts/e2e2-env-check.mjs http://localhost:3000

# DB state for E2E Test Client
node scripts/e2e2-db-probe.mjs

# Full workflow + screenshots
node scripts/e2e2-workflow.mjs http://localhost:3000
```

---

## Verdict

**Environment: PARTIALLY STABLE**

- Local app + Supabase: OK  
- NTF-1 schema: NOT APPLIED  
- SignWell: credentials invalid / webhook ID missing  
- Resend: credentials invalid / production FROM address not usable  
- Stripe: intentionally skipped  

Proceed with E2E-2 lifecycle steps only after SignWell + Resend keys are valid and NTF-1 SQL is applied.
