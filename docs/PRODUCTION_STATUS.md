# Production Status

Updated: Agency workspace provision (branding, billing, settings). **Apply DB migration before launch.**

---

## Agency workspace provision (required for launch)

**Migration:** `supabase/migrations/20260604150000_agency_workspace_provision.sql`

| What | Why |
|------|-----|
| `provision_agency_workspace()` trigger on `agencies` INSERT | Every new agency gets `branding_settings`, `matter_defaults`, `subscriptions` (trialing), payment schedules |
| Backfill for existing agencies | Fixes RLS upsert failures and billing `PGRST116` for workspaces like `ritiklabs` |
| RLS INSERT on `branding_settings` for owner/admin | Tenant-safe first save without service-role bypass |

**Apply on production Supabase:**

```bash
npx supabase db push
# or: node scripts/apply-agency-provision-migration.mjs
```

**App changes (deploy to Vercel):** signup calls `provisionAgencyWorkspace`; API routes use `getWorkspaceApiContext` (no `redirect()` in `/api/*`); branding PATCH uses tenant RLS.

**Verify after migrate + deploy:**

1. Settings → Branding → Save (no `42501`).
2. Billing page loads (trialing, empty invoice list OK).
3. New signup creates workspace with defaults (no manual seed).

---

## Input validation (launch)

**Migration:** `supabase/migrations/20260604160000_input_validation_constraints.sql`

- DB `CHECK` constraints: phone (8–15 digits), MARN (7 digits), ABN (11 digits) on clients, users, agencies, agreements, rmas.
- App: `src/lib/validations/fields.ts` + Zod schemas; `PhoneInput` / `DigitsInput` block invalid typing in UI.
- APIs validated: signup, team invite, accept invite, branding PATCH, agreement standard send.

**Apply with:** `npx supabase db push` (includes provision + validation migrations).

---

Updated: Phase 16.99 (webhook code + replay/ngrok evidence). **Full platform deploy: still gated.**

---

## Phase 16.99 — SignWell webhook (`/api/webhooks/signwell`)

### Code fixes (deploy required)

- Parse document id from `data.object.id` (was wrong path → silent ignore).
- Verify `event.hash` with **`SIGNWELL_WEBHOOK_ID`** (SignWell subscription UUID), not legacy body HMAC only.
- Agreement path: `document_completed`, `signwell_status`, `activity_logs`, notifications; audit `user_id` optional for system events.
- Idempotency: `processed_webhooks.webhook_id` = `event.hash`.

### Proven locally (no extra SignWell sends)

| Check | Result |
|-------|--------|
| Replay `document_viewed` → localhost:3000 | **200**, `processed_webhooks` row |
| Same via ngrok → :3000 (dev server running) | **200** |
| DB after replay (AGR-2026-0002) | `status=viewed`, `signwell_status=viewed` |

### Not proven yet

- Real SignWell `document_completed` after client signs on **production** URL.
- Production Vercel env: `SIGNWELL_WEBHOOK_ID`, webhook URL `https://app.immisign.com/api/webhooks/signwell`, **`SKIP_WEBHOOK_VALIDATION` must be unset/false**.

### Migrations

- **`processed_webhooks`**: already in `20260529000003_signwell_tables.sql` — no new table migration for 16.99.
- **`20260608100000_phase16_9_workflow_integrity.sql`**: indexes only — run on prod if not already applied (`supabase db push` / dashboard).

### Existing users

- **No re-registration.** Webhook + send fixes are server-side. Existing `users`, `agencies`, and agreements with `signwell_document_id` will update when SignWell posts events to the live webhook URL.

---

Updated: Phase 16.98 (DB + code evidence).

## Send Document — **PASS (user-reported)**

User confirmed SignWell email received after 16.97 send-body fix + `SIGNWELL_TEST_MODE=false`.

Re-verify on each deploy: `node scripts/phase16-96-send-verify.mjs <slug>` → `pass: true`.

---

## Phase 16.98 — Agreement Send E2E

### What was tested (automated)

- DB audit: `node scripts/phase16-98-agreement-invite-audit.mjs anshu-labs avc-migration-live abc-lab`
- Code trace: wizard → `POST /api/agreements/standard` → `SignWellService.sendForSignature` → `createAndSendSignwellDocument` (uses send body after 16.97)

### DB evidence — agreement **dispatch** (partial PASS)

| Workspace | Agreement | signwell_document_id | status | Activity “Dispatched” |
|-----------|-----------|----------------------|--------|------------------------|
| anshu-labs | AGR-2026-0002 | `dea4bae0-…` | sent | yes |
| anshu-labs | AGR-2026-0001 | `f5cf2706-…` | sent | yes |
| avc-migration-live | AML-2026-1035 (5 recent) | all have SignWell IDs | sent | yes (historical) |
| abc-lab | AGR-2026-0019 etc. | IDs on sent rows | sent | yes |

- Agreement PDF rows exist in `documents` (linked by `agreement_id`).
- `signwell_status` on agreements is **NULL** for all sampled rows.
- **`processed_webhooks`**: was empty pre-16.99; after webhook fix + replay, rows exist for replay events (not yet from live SignWell sign).

### Answers (evidence-based)

| Question | Answer |
|----------|--------|
| Did client receive agreement email? | **UNKNOWN** — not verified in this session. SignWell sends to `client_email` on agreement (e.g. `kartiksingh37193@gmail.com` on anshu-labs), not necessarily `kartiksingh2829@gmail.com`. |
| Does agreement lifecycle complete automatically after sign? | **NO (not proven)** — zero rows in `processed_webhooks`; statuses remain `sent`, not `signed`/`completed`. |

### Agreement workflow status: **Partially Working**

- Working: create, PDF, SignWell ID on agreement, activity log on dispatch.
- Broken / unproven: client inbox proof, webhook ingestion, post-sign status, dashboard/timeline after sign.

---

## Phase 16.98 — Team Invite E2E

### What was tested (automated)

- DB `invitations` + `users` for three workspaces (script above).
- Code: `POST /api/team/invite` → Resend (`sendEmailWithForensicLogging`); rollback on email failure.
- Accept: `POST /api/auth/accept-invite` → `admin.createUser` + `users` upsert + `accepted_at`.

### DB evidence — invites

| Workspace | Invites | Accepted | Pending | Notes |
|-----------|---------|----------|---------|-------|
| anshu-labs | 0 | 0 | 0 | No invite history |
| avc-migration-live | 6 | 1 | 5 | `kartiksingh2829@gmail.com` invite **still pending** (created 2026-06-02) |
| abc-lab | 6 | 1 | 5 | One E2E accept: `invite166.*@example.com` → user row + `team.joined` activity |

Accepted invite integrity (abc-lab): no orphan users, no duplicate emails for accepted row.

### Answers (evidence-based)

| Question | Answer |
|----------|--------|
| Was invite email actually delivered? | **UNKNOWN** for pending invites (no Resend dashboard access). **YES (accept path)** for abc-lab test invite — `accepted_at` set, user created. |
| Accept flow (token, agency, role)? | **PASS** in code + one DB proof (abc-lab). |
| Roles enforced UI + API? | **PARTIAL** — API blocks non-owner/admin invites (`team/invite` route). Full role matrix **not browser-tested** this session. |

### Invite workflow status: **Partially Working**

- Working: invite row creation, accept → auth user + agency link (proven once).
- Broken / unproven: Resend delivery to real staff inboxes at scale; AVC pending invites; 5-of-5 staff success **not proven**.

---

## AVC Migration — “5 staff invites tomorrow”

**Cannot answer YES from evidence.**

Proof today:

- 6 historical invites; **only 1 accepted**.
- `kartiksingh2829@gmail.com` invitation exists but **`accepted_at` is NULL** (email not acted on, or not received, or link not used).
- Code will roll back DB invite if Resend returns error; will not create user until accept endpoint runs.
- Seat/billing warning may apply (`getAgencySeatSnapshot`).

**Need from you:** Resend dashboard delivery log for `kartiksingh2829@gmail.com` + confirmation whether production `NEXT_PUBLIC_APP_URL` matches live domain (invite links use this).

---

## Production readiness summary

| Area | Status |
|------|--------|
| Send Document | **Working** (user inbox confirmed; keep DB script on deploy) |
| Agreement dispatch | **Partially Working** |
| Agreement sign + webhook | **Partially Working** (handler fixed + replay; live SignWell sign unproven) |
| Invite create + accept | **Partially Working** |
| Invite email delivery | **Unproven** (Resend) |
| Auth | **Partially Working** (accept path proven) |
| RBAC | **Partially Working** (code only) |
| Notifications | **Partially Working** (dispatch logs exist; sign webhooks missing) |
| SignWell | **Working** for dispatch IDs; **unproven** for webhooks |
| Resend | **Unproven** without dashboard |

---

## Safe to deploy? **NO** (for full platform) / **YES** (push code + verify on live)

### Blocks full-platform sign-off

1. Agreement **sign → live SignWell webhook → `signed`** not proven on production URL (replay only so far).
2. Agreement **client email** not confirmed in inbox this phase.
3. Team invite **delivery** not proven for real staff emails (pending rows).
4. 16.97 SignWell send-body fix must be on Vercel before Send Document stays PASS.
5. Vercel env still not audited from CI (need screenshot).

### Recommended push + live checklist

1. Push current branch (16.97 send + 16.99 webhook + wizard UX).
2. Vercel env: `SIGNWELL_TEST_MODE=false`, `SIGNWELL_WEBHOOK_ID=<dashboard webhook id>`, no `SKIP_WEBHOOK_VALIDATION`.
3. SignWell dashboard: webhook → `https://app.immisign.com/api/webhooks/signwell` (not ngrok).
4. Apply migration `20260608100000_phase16_9_workflow_integrity.sql` if missing on prod DB.
5. One agreement sign on existing sent agreement → confirm `processed_webhooks` + status `signed` + notification.
6. `node scripts/phase16-96-send-verify.mjs <slug>` after deploy.

---

## Scripts

```bash
node scripts/phase16-98-agreement-invite-audit.mjs anshu-labs avc-migration-live
node scripts/phase16-96-send-verify.mjs anshu-labs
node scripts/phase16-6-invite-e2e.mjs http://localhost:3001   # local accept-path test
```

---

## Questions (need your input — do not guess)

1. Did you receive an **agreement** SignWell email (which inbox / which client email)?
2. Did anyone **complete signing** on an agreement? If yes, which `agreement_number`?
3. Resend dashboard: delivered / bounced for `kartiksingh2829@gmail.com` invite on avc-migration-live?
4. SignWell dashboard: webhook URL configured to production `/api/webhooks/signwell`?
5. Production `NEXT_PUBLIC_APP_URL` value on Vercel?
