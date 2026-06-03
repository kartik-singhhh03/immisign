# Phase 11.2 — Production Readiness Report

**Audit date:** 2026-06-03  
**Target project:** `wnohcmgmyhamsbmkiybc.supabase.co` (from `.env.local`)  
**Phase 12:** **Not started** (blocked on critical items below)

---

## Launch readiness score: **79 / 100** (updated Phase 11.4 — see [PHASE_11_4_PRODUCTION_VERIFICATION.md](PHASE_11_4_PRODUCTION_VERIFICATION.md))

| Area | Weight | Score | Notes |
|------|--------|-------|-------|
| Database / migrations | 25% | 8/25 | Critical columns missing on remote DB |
| Agreement E2E | 15% | 5/15 | Blocked by schema + no browser run in this audit |
| Send Document E2E | 15% | 5/15 | Blocked by schema + no browser run |
| Auto agent signatures | 10% | 2/10 | DB columns for agreements/documents/rmas missing |
| Stripe billing | 15% | 10/15 | Live prices valid; key mismatch; E2E not run |
| Permissions | 10% | 9/10 | Static checks pass; manual matrix pending |
| Code / P0 hardening | 10% | 9/10 | Phase 11.1 static verifier all PASS |

**Verdict:** **Not launch-ready.** Apply schema repair, fix Stripe key mode, then re-run smoke tests. Do **not** start Phase 12 until score ≥ **85** and critical blockers are cleared.

---

## Task 1 — Migration verification

### Tools run

```bash
node scripts/phase11-2-migration-verify.mjs
node scripts/list-schema-migrations.mjs   # schema_migrations not exposed via API
```

### Applied vs local (22 migration files in repo)

Remote Supabase does **not** expose `public.schema_migrations` via PostgREST (custom migration tracker may never have been created on this project). History was inferred by **table/column probes** using the service role.

### Tables — status

| Table | Status |
|-------|--------|
| `agreement_wizard_drafts` | **PASS** (exists, 1 row) |
| `send_document_drafts` | **PASS** (exists) |
| `matter_type_fields` | **PASS** (42 rows) |
| `application_approvals` | **PASS** (exists, RLS policies assumed from partial apply) |
| `approval_comments` | **PASS** (exists) |
| `branding_settings` | **PASS** (2 rows) |
| `agencies`, `users`, `invitations`, `agreements`, `documents` | **PASS** |
| `processed_webhooks` | **PASS** |

### Columns — **FAIL** (schema mismatches)

| Table.Column | Status |
|--------------|--------|
| `agreements.agent_signed_at` | **MISSING** |
| `agreements.agent_signature_url` | **MISSING** |
| `agreements.agent_signer_user_id` | **MISSING** |
| `documents.signwell_document_id` | **MISSING** |
| `documents.signwell_status` | **MISSING** |
| `documents.sender_signed_at` | **MISSING** |
| `documents.sender_signature_url` | **MISSING** |
| `documents.sender_user_id` | **MISSING** |
| `rmas.signature_mode` | **MISSING** |
| `rmas.signature_text` | **MISSING** |
| `subscriptions.included_seats` | **MISSING** |
| `subscriptions.billable_seats` | **MISSING** |
| `subscriptions.additional_seats` | **MISSING** |
| `subscriptions.stripe_seat_item_id` | **MISSING** |

### Pending migrations (logical)

These repo migrations were **not** fully reflected on remote:

- `20260603100000_immisign_single_plan_billing.sql`
- `20260603150000_auto_agent_signatures.sql`
- `20260603170000_phase11_1_hardening.sql` (document SignWell columns)
- Possibly others applied partially via dashboard

### Failed migrations

None recorded (no `DATABASE_URL` / `SUPABASE_DB_PASSWORD` in `.env.local` — migration runner could not connect).

**Note:** `.env.local` currently lists Supabase URL and service role key but **not** `DATABASE_URL` or `SUPABASE_DB_PASSWORD`. Add one of these from **Supabase → Project Settings → Database** to run:

```bash
node scripts/run-pending-migrations.mjs
```

### Remediation (required)

**Option A — CLI/script (preferred):**

1. Add to `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"
   ```
2. Run: `node scripts/run-pending-migrations.mjs`

**Option B — SQL Editor:**

1. Supabase Dashboard → **SQL Editor**
2. Run entire file: `supabase/migrations/20260603180000_phase11_2_schema_repair.sql` (idempotent repair)
3. Re-run: `node scripts/phase11-2-migration-verify.mjs` (expect exit 0)

### Migration verification summary

| Item | Result |
|------|--------|
| Applied migrations (tracked) | **UNKNOWN** — no API access to tracker table |
| Missing migrations (effective) | **YES** — 14+ column gaps |
| Failed migrations | **NONE** (not attempted) |
| Schema matches app | **FAIL** |

---

## Task 2 — Agreement smoke test

| Step | Status | Notes |
|------|--------|-------|
| Wizard steps (client → send) | **NOT RUN** | Requires browser + owner session |
| Draft persistence | **PASS** (code + table exists) | Remote table OK |
| Agreement numbering | **NOT RUN** | |
| Matter fields / clauses | **NOT RUN** | |
| Preview / PDF generation | **NOT RUN** | |
| SignWell create + ID stored | **BLOCKED** | `agent_signed_at` columns missing may break send |
| Email / message / CC / reminders | **PASS** (code) | `buildSignwellDispatchExtras` wired |
| Audit logs | **NOT RUN** | |

**Screenshots:** Not captured in automated audit. Operator should save under `docs/verification-screenshots/`:

- `agreement-wizard-steps.png`
- `agreement-preview.png`
- `agreement-sent-confirmation.png`
- `signwell-dashboard-document.png`

**Suggested command (with owner credentials):**

```bash
node scripts/phase6e-browser-agreement.mjs <owner-email> <password> http://localhost:3001
```

---

## Task 3 — Send document smoke test

| Step | Status | Notes |
|------|--------|-------|
| Upload | **NOT RUN** | |
| Signers / Email / Review / Send | **NOT RUN** | |
| PDF preview | **PASS** (code) | Blob + attestation preview API |
| Agent attestation PDF | **BLOCKED** | Needs `sender_*` columns + RMA signature |
| SignWell ID stored | **BLOCKED** | `signwell_document_id` column missing |
| Webhook status update | **BLOCKED** | Depends on column + webhook delivery |

**Screenshots (operator):**

- `send-doc-review-preview.png`
- `send-doc-dispatch-success.png`

---

## Task 4 — Auto agent signature verification

| Check | Status |
|-------|--------|
| Typed signature | **BLOCKED** — `rmas.signature_mode`, `signature_text` missing |
| Uploaded signature | **PARTIAL** — `rmas.signature_url` exists |
| Preview / PDF / sent packet | **NOT RUN** |
| Agent excluded from SignWell recipients | **PASS** (code) |
| Signed date / name / MARN on PDF | **NOT RUN** |

**Screenshots (operator):** `rma-signature-settings.png`, `agreement-pdf-agent-block.png`

---

## Task 5 — Stripe subscription verification

### Automated checks

```bash
node scripts/phase11-2-stripe-verify.mjs    # prices OK, key mismatch FAIL
node scripts/phase11-2-seat-math-verify.mjs # PASS all seat tiers
```

| Check | Status |
|-------|--------|
| Base price $49 AUD | **PASS** (`price_1Te8Jp...`, 4900 cents) |
| Seat price $10 AUD | **PASS** (`price_1Te8Jp...`, 1000 cents) |
| Secret vs publishable mode | **FAIL** — `sk_live_` with `pk_test_...` placeholder |
| Checkout / portal / webhooks E2E | **NOT RUN** |
| Seat sync on invite/deactivate | **NOT RUN** |

**Critical:** Use **test** keys on localhost and **live** keys only in Vercel production, never mixed.

**Screenshots (operator):** `billing-page.png`, `stripe-checkout.png`, `stripe-subscription-items.png`, `stripe-portal.png`

---

## Task 6 — Permissions matrix verification

### Static audit — **PASS**

```bash
node scripts/phase11-2-permissions-audit.mjs
```

| Capability | Owner | Admin | Agent | Manager | Assistant | Staff |
|------------|:-----:|:-----:|:-----:|:-------:|:---------:|:-----:|
| Billing UI / checkout API | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings write | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Team invites (settings) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Templates create | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

### Manual UI/API matrix — **PENDING**

Test accounts exist on demo agency (`avc-migration-live`):

- `admin@demoagency.com`, `agent@demoagency.com`, `manager@demoagency.com`, etc.

Use sidebar **role simulator** (development) and verify routes: Billing, Settings, Team, Agreements, Documents, Application Approvals, Templates, Reports.

**Known non-blocker:** `GET /api/stripe/billing` is readable by all authenticated roles; sensitive invoice preview is limited to owner/admin inside the handler.

**Bypasses found:** None in static audit.

---

## Task 7 — Production hardening (fixes in this phase)

| Fix | File / artifact |
|-----|-----------------|
| Migration verifier corrected (`subscriptions` vs `agencies` for Stripe fields) | `scripts/phase11-2-migration-verify.mjs` |
| Idempotent schema repair migration | `supabase/migrations/20260603180000_phase11_2_schema_repair.sql` |
| Phase 11.2 verification scripts | `scripts/phase11-2-*.mjs` |
| DATABASE_URL documentation | `.env.example` |
| Stripe owner guide | `docs/STRIPE_SETUP_GUIDE.md` |

No new product features. Phase 12 not touched.

---

## Task 8 — Stripe setup documentation

**Delivered:** [`docs/STRIPE_SETUP_GUIDE.md`](STRIPE_SETUP_GUIDE.md)

---

## Critical blockers (must fix before launch)

1. **Apply database schema repair** — run `20260603180000_phase11_2_schema_repair.sql` or full migration runner with `DATABASE_URL`.
2. **Fix Stripe key mode** — align `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (both test or both live).
3. **Complete E2E smoke tests** (Tasks 2–5) after schema fix and capture screenshots.
4. **Replace placeholder** `STRIPE_WEBHOOK_SECRET` and `pk_test_...` in `.env.local` for real environments.

---

## Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Send/agreement flows fail at runtime due to missing columns | **Critical** | Apply schema repair immediately |
| Live Stripe key on developer machine | **High** | Rotate to test keys locally; restrict live key to Vercel production |
| Webhook secret placeholder | **High** | Configure production webhook + `whsec_` in Vercel |
| Untested SignWell + email delivery | **Medium** | Owner smoke test after schema fix |
| Application Approvals RLS untested with real users | **Medium** | Agent/owner CRUD test after migration |

---

## Verification scripts reference

| Script | Purpose |
|--------|---------|
| `node scripts/phase11-2-migration-verify.mjs` | Tables + columns vs expectations |
| `node scripts/phase11-2-stripe-verify.mjs` | Stripe price IDs + key mode |
| `node scripts/phase11-2-seat-math-verify.mjs` | $49 + $10 seat formula |
| `node scripts/phase11-2-permissions-audit.mjs` | Static permission wiring |
| `node scripts/phase11-1-hardening-verify.mjs` | Phase 11.1 P0 code checks |

---

## Screenshot index

Place operator-captured images in `docs/verification-screenshots/` (folder may be created during manual QA). Referenced names are listed in Tasks 2–5 above.

---

## Phase 12 gate

| Requirement | Met? |
|-------------|------|
| All migrations applied | **NO** |
| Schema probes pass | **NO** |
| Agreement + Send Document E2E | **NO** |
| Stripe E2E in test mode | **NO** |
| Permissions manual matrix | **NO** |
| Launch score ≥ 85 | **NO** (48/100) |

**Phase 12 (Application Approval Module) must remain deferred.**
