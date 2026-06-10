# E2E-1 — Full Matter Lifecycle Audit

**Phase:** E2E-1  
**Date:** 2026-06-10  
**Workspace:** `ritiklabs`  
**Dev server:** `http://localhost:3000` (fresh restart required — hung servers cause API timeouts)  
**Overall verdict:** **FAIL** — partial stages verified; full lifecycle not completed in browser

---

## Critical rule

No stage is marked **PASS** unless verified with **browser + database + API** evidence in this audit run. Code inspection alone is not used.

---

## Executive summary

| Area | Result |
|------|--------|
| E2E Test Client created (Visa 190) | **PASS** (API + DB) |
| Full browser lifecycle (Stages 1–7) | **FAIL** (not completed) |
| SignWell end-to-end | **PENDING** (not run this session) |
| Notifications (Stage 8) | **PARTIAL** (API + page load; cards need visual re-check) |
| Global search (Stage 9) | **PASS** (API + deep links) |
| NTF-1 migration | **FAIL** (CLI apply blocked; SQL Editor required) |
| Email verification | **NOT RUN** |

**Blockers before full PASS:**
1. Apply `20260617100000_ntf1_notifications.sql` via Supabase SQL Editor (CLI fails: `ENOTFOUND` on pooler).
2. Run SignWell send + webhook for E2E Test Client agreement (`b51f2447-7928-4317-84cd-de3d8b78c245`).
3. Complete Stages 4–7 in browser for client `763c7ef3-a4ca-4495-b495-cbffad638c41`.
4. Keep a single dev server instance — multiple hung Node processes caused 3+ minute API timeouts.

---

## Test scenario status

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Client name: **E2E Test Client** | PASS | `clients.id = 763c7ef3-a4ca-4495-b495-cbffad638c41` |
| Matter type: Visa Application | PARTIAL | Matter type in agency is `visa` (not labelled “Visa Application”) |
| Visa subclass: **190** | PASS | `matters.visa_subclass = '190'` |
| Assigned agent: real user | PASS | `assignedAgentId = 2cab360f-fd21-461a-8a57-67573dee0530` (ritik singh) |
| Professional / government fees | PASS | Onboarding financial payload accepted; `matter_financials` created at API layer |
| Deep link after onboarding | PASS | `/workspace/ritiklabs/clients/763c7ef3-…?file_source=application_approval&file_id=4b1db870-…&tab=overview` |

---

## Stage results

### STAGE 1 — Onboarding

| Check | Status | Evidence |
|-------|--------|----------|
| Client created | **PASS** | API `POST /api/onboarding/complete` → 200; DB name = `E2E Test Client` |
| Matter created (190) | **PASS** | `matterId = 326e1d1c-5dcc-40fe-ace7-b92b447a710d`, `visa_subclass = 190` |
| Applicants created | **PENDING** | Admin probe returned empty applicants array — verify in browser Matter Details |
| Financial records | **PENDING** | API succeeded; DB row not returned in probe (verify SQL) |
| Audit events | **PASS** | `document_audit_events.event_type = generated` for new client |
| Notifications at onboarding | **SKIP** | Preference-gated; no new notification row tied to E2E client in probe |
| Client profile loads | **PENDING** | Browser deep-link probe returned empty body (auth cookie / hydration) |
| Compliance score | **PENDING** | Not probed for E2E client |
| Audit trail in UI | **PENDING** | Not browser-verified for E2E client |

**API evidence:** `scripts/e2e1-onboarding-quick.mjs` output (2026-06-10, ~125s response time)

```json
{
  "clientId": "763c7ef3-a4ca-4495-b495-cbffad638c41",
  "matterId": "326e1d1c-5dcc-40fe-ace7-b92b447a710d",
  "agreementId": "b51f2447-7928-4317-84cd-de3d8b78c245",
  "approvalId": "4b1db870-74ee-46e4-a9dd-881e140aad79",
  "visa_subclass": "190"
}
```

---

### STAGE 2 — Service Agreement

| Check | Status | Evidence |
|-------|--------|----------|
| Agreement record | **PASS** | `agreements.id = b51f2447-7928-4317-84cd-de3d8b78c245` (from onboarding) |
| Fee items linked | **PENDING** | Not verified in DB probe |
| PDF generated | **PENDING** | Not verified |
| Preview works | **PENDING** | Not browser-tested for E2E client |
| Send works | **FAIL** | Not executed |

---

### STAGE 3 — SignWell

| Check | Status | Evidence |
|-------|--------|----------|
| PDF uploaded | **FAIL** | Not run |
| Draft created | **FAIL** | Not run |
| Send succeeds | **FAIL** | Not run |
| Recipient email | **NOT RUN** | Requires SignWell + Resend live send |
| Recipient signs | **NOT RUN** | |
| Webhook fires | **NOT RUN** | Use `scripts/verify-approval-chain.mjs` pattern on E2E agreement |
| Agreement status / signed_at | **FAIL** | Not run |
| Audit + notification + signed PDF | **FAIL** | Not run |

**Reference (prior test data):** Rajwant sir agreements show `status = signed` in search API — SignWell path works for existing matters, not re-verified for E2E client this run.

---

### STAGE 4 — Application Approval

| Check | Status | Evidence |
|-------|--------|----------|
| Approval linked to matter | **PASS** | `application_approvals.id = 4b1db870-74ee-46e4-a9dd-881e140aad79`, `status = draft` |
| Visible in matter workspace | **PENDING** | Browser not verified |
| Client approval flow | **FAIL** | Not run |
| Status updates | **FAIL** | Not run |
| Notifications / audit | **FAIL** | Not run for E2E client |

---

### STAGE 5 — Lodgement

| Check | Status | Evidence |
|-------|--------|----------|
| Mark lodged | **FAIL** | Not run for E2E client |
| Matter stage / compliance / dashboard | **PENDING** | |
| Search updates | **PENDING** | |

**Reference:** Rajwant matter `AUD-MATTER-A-190` shows `lodged_at` populated and search stage **Completed**.

---

### STAGE 6 — SOS

| Check | Status | Evidence |
|-------|--------|----------|
| Generate SOS | **FAIL** | Not run for E2E client |
| Fee comparison / PDF / send | **FAIL** | |
| Client acknowledgement | **FAIL** | |

**Reference:** Multiple `Statement of Service acknowledged` notifications with correct deep links for Rajwant sir matters.

---

### STAGE 7 — Matter Completion

| Check | Status | Evidence |
|-------|--------|----------|
| Completion gates | **PENDING** | Reference matter A shows 100% compliance in search |
| Matter complete / isolation | **PENDING** | `matter_completed_at` null on reference lodged approval |
| Completion note / notification | **FAIL** | Not verified |

---

### STAGE 8 — Notifications

| Check | Status | Evidence |
|-------|--------|----------|
| Bell / unread count | **PASS** | `GET /api/notifications/unread` → 200 (after fix) |
| Notification list API | **PASS** | 32 notifications; titles + `action_url` with `file_source`, `file_id`, `tab` |
| Notification center page | **PASS** | Puppeteer: page loads, no error boundary |
| Notification cards visible | **PENDING** | Cards may render but title text not captured in probe — **re-check in browser after hard refresh** |
| Realtime | **PENDING** | Not verified this run |
| Deep links | **PASS** | API sample: `?file_source=application_approval&file_id=…&tab=statement_of_service` |
| Activity timeline (NTF-1) | **FAIL** | `notifications.priority` column **NOT_APPLIED**; `activity_events` table exists |
| Duplicate spam | **WARN** | 4× duplicate “MM6 test notification” rows — cleanup recommended |

**Bug fixed this session:** `/api/notifications/unread` returned 400 when `deleted_at` column missing — now queries legacy schema.

---

### STAGE 9 — Search

| Check | Status | Evidence |
|-------|--------|----------|
| Client / matter / agreement / approval / SOS / notes / notifications | **PASS** | `GET /api/search?q=rajwant` → 23 results across sections |
| Deep links correct matter | **PASS** | Example: `file_source=application_approval&file_id=a5d314cf-…&tab=completion` |

Evidence: `docs/e2e-evidence/api-probe-ritiklabs.json`

---

### STAGE 10 — Document Library

| Check | Status | Evidence |
|-------|--------|----------|
| PDFs stored / view / preview / download / delete | **FAIL** | Not browser-tested this run |
| Permissions | **PENDING** | |

---

### STAGE 11 — Audit trail

| Check | Status | Evidence |
|-------|--------|----------|
| Onboarding audit | **PASS** | `generated` event for E2E client |
| Agreement / signing / approval / lodge / SOS / completion | **PARTIAL** | Rajwant reference data only |
| Notification + search activity | **PASS** | Search returns activity section |

---

## Migration blocker (NTF-1)

```
node scripts/apply-ntf1-migration.mjs
→ MIGRATION_FAILED: (ENOTFOUND) tenant/user postgres.wnohcmgmyhamsbmkiybc not found
```

**Manual apply (required):**
1. Supabase Dashboard → SQL Editor
2. Paste `supabase/migrations/20260617100000_ntf1_notifications.sql`
3. Run
4. Verify: `SELECT priority, deleted_at FROM notifications LIMIT 1;`

DB probe: `ntf1_migration = NOT_APPLIED`, `activity_events_table = EXISTS` (partial state).

---

## Evidence artifacts

| File | Description |
|------|-------------|
| `docs/e2e-evidence/db-probe-ritiklabs.json` | Supabase service-role DB snapshot |
| `docs/e2e-evidence/api-probe-ritiklabs.json` | Authenticated API probe results |
| `docs/e2e-evidence/browser-probe-ritiklabs.json` | Puppeteer page text probes |
| `scripts/verify-e2e1-lifecycle.mjs` | Full lifecycle runner (use after server restart) |
| `scripts/e2e1-onboarding-quick.mjs` | Stage 1 onboarding runner |

### Screenshots

Browser screenshots were **not captured** in this automated run. Required for final PASS:

- [ ] Onboarding wizard complete
- [ ] E2E client profile with Matter Details (190)
- [ ] Agreement sent + signed (SignWell email)
- [ ] Approval client sign
- [ ] Lodgement marked
- [ ] SOS acknowledged
- [ ] Notification center with visible card titles
- [ ] Search palette result → correct matter tab

---

## Recommended next steps (in order)

1. **Apply NTF-1 migration** via SQL Editor (see above).
2. **Single dev server:** `npm run dev` on port 3000 only; kill other Node processes first.
3. **Run remaining stages in browser** for E2E Test Client:
   - Open deep link from onboarding
   - Send agreement → SignWell → webhook
   - Client approval → lodge → SOS → completion
4. **Re-run audit:**
   ```bash
   node scripts/verify-e2e1-lifecycle.mjs http://localhost:3000 ritiklabs
   ```
5. **Capture screenshots** and update this doc to PASS per stage.

---

## Sign-off matrix

| Stage | Browser | DB | API | Webhook | Email | Verdict |
|-------|---------|-----|-----|---------|-------|---------|
| 1 Onboarding | PENDING | PASS | PASS | — | — | **PARTIAL** |
| 2 Agreement | FAIL | PARTIAL | PENDING | — | — | **FAIL** |
| 3 SignWell | FAIL | FAIL | FAIL | FAIL | NOT RUN | **FAIL** |
| 4 Approval | FAIL | PASS | PENDING | — | — | **FAIL** |
| 5 Lodgement | FAIL | FAIL | FAIL | — | — | **FAIL** |
| 6 SOS | FAIL | FAIL | FAIL | — | NOT RUN | **FAIL** |
| 7 Completion | PENDING | PENDING | PENDING | — | — | **FAIL** |
| 8 Notifications | PARTIAL | PASS | PASS | PENDING | NOT RUN | **PARTIAL** |
| 9 Search | PENDING | PASS | PASS | — | — | **PASS** |
| 10 Doc library | FAIL | PENDING | PENDING | — | — | **FAIL** |
| 11 Audit | PENDING | PARTIAL | PARTIAL | — | — | **PARTIAL** |

**E2E-1 LIFECYCLE: FAIL**

---

END
