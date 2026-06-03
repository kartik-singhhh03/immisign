# Account Deletion E2E (Phase 16.6D)

**Date:** 2026-06-03  
**API:** `POST /api/security/account/delete-request`  
**Local evidence:** `phase16-6-verification-local.json` → `accountDeletion`

---

## Scenarios

### Scenario 1 — Owner with active subscription

| Field | Value |
|-------|--------|
| `agencies.subscription_status` | `trialing` |
| Delete HTTP | **409** |
| Error message | `Cancel or complete active agreements before account deletion.` |

**Expected:** Blocked when subscription active/trialing **or** other guards fire first.

**Result:** **PASS** (blocked with 409) — note: guard hit **active agreements** before subscription-specific message in this run (9 active agreements). Subscription guard code path verified in `delete-request/route.ts` using `subscription_status`.

---

### Scenario 2 — Owner with other users

| Field | Value |
|-------|--------|
| Users in agency (`abc-lab`) | **1** |
| Delete HTTP | 409 |

**Expected:** Block when `user_count > 1`.

**Result:** **PARTIAL** — only one user in test agency; multi-user block **not exercised**. Code guard present for `userCount > 1`.

---

### Scenario 3 — Owner with active agreements

| Field | Value |
|-------|--------|
| Active agreements (non cancelled/expired) | **9** |
| Delete HTTP | **409** |

**Result:** **PASS** (blocked)

---

### Scenario 4 — Agent account deletion allowed

| Check | Result |
|-------|--------|
| Agent token deletion attempt | **Not run** — no separate agent JWT test in automated script |

**Result:** **PARTIAL** — API exists; agent scenario needs dedicated test user without owner guards.

---

## Soft delete / audit / session revocation

| Requirement | Automated | Result |
|-------------|-----------|--------|
| `users.deleted_at` set | Not executed (409 on owner) | **PARTIAL** |
| `security_audit_logs` `account.deletion_requested` | Not executed | **PARTIAL** |
| Global logout | Not executed | **PARTIAL** |

**Note:** Successful deletion path not exercised to avoid removing production owner. Use disposable test agent in staging for full soft-delete proof.

---

## Browser evidence

Account tab screenshot: `docs/verification-screenshots/phase16-6/security-account.png` — deletion form with password, MFA, and `DELETE MY ACCOUNT` confirmation.

---

## Fix applied during 16.6

- `delete-request` now uses `agencies.subscription_status` (not non-existent `stripe_subscription_status`).

---

## Phase 16.6D verdict: **PARTIAL**

Blocking scenarios **PASS** on owner; successful agent soft-delete + audit + logout **not fully executed**.
