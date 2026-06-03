# SignWell E2E Verification (Phase 16.6G)

**Date:** 2026-06-03  
**Agency:** `abc-lab`

---

## Test A — Client email == agent email, CC enabled

**Expected:** HTTP **422**, friendly message, **no 502**

| Environment | HTTP | Error excerpt | Result |
|-------------|------|---------------|--------|
| **Local** (`localhost:3001`) | **422** | `The CC email cannot be the same as a signer...` | **PASS** |
| **Production** (`immisign.vercel.app`) | **502** | SignWell raw 422 wrapped as retry failure | **FAIL** |

Evidence: `phase16-6-verification-local.json` vs `phase16-6-verification-production.json` → `signwell.test_a_same_email_cc`

**Action:** Deploy SignWell validation fixes (`recipient-validation.ts`, `dispatch-extras.ts`, standard route) to Vercel.

---

## Test B — Distinct client email

| Environment | HTTP | Result |
|-------------|------|--------|
| Local | **200** | **PARTIAL** (success or SignWell quota — no 5xx) |
| Production | **200** | **PARTIAL** |

No server error (5xx) on either environment for distinct email in automated run.

---

## Test C — Webhook lifecycle

| Check | Result |
|-------|--------|
| Agreements with `signwell_document_id` in DB | **PASS** (3+ rows sampled) |
| `signwell_status` populated on sample | **PARTIAL** (null on recent rows; status on `agreements.status` = `sent`) |
| Full Open → Signed → webhook → DB update | **PARTIAL** — not replayed in 16.6 automation |

Sample DB rows (local verification):

- `signwell_document_id`: `80ece8ed-44da-4e6c-b5b9-103415bc2254`, agreement status `sent`

Prior docs: `docs/SIGNWELL_ROOT_CAUSE.md`

---

## Phase 16.6G verdict

| Test | Local | Production |
|------|-------|------------|
| A (duplicate CC) | **PASS** | **FAIL** |
| B (distinct email) | **PARTIAL** | **PARTIAL** |
| C (webhook) | **PARTIAL** | **PARTIAL** |

**SignWell production sign-off: FAIL** until Vercel deploy of Phase 14–16 stabilization commits.
