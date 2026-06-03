# Account Deletion Policy (Phase 16B)

**Date:** 2026-06-03  
**Scope:** Secure account deletion for ImmiMate workspace users handling migration compliance data.

---

## Principles

1. **Soft delete** — User row marked inactive; `deleted_at` set; auth sessions revoked.
2. **No silent deletion** — Password confirmation, MFA when enrolled, typed confirmation phrase.
3. **Owner safeguards** — Cannot delete while subscription active, other users exist, or active compliance work remains.
4. **Audit** — Every deletion request logged in `security_audit_logs` (`account.deletion_requested`).

---

## Who can delete

| Role | Self-delete | Notes |
|------|-------------|-------|
| Owner | Yes, with guards | Must clear team, billing, agreements, approvals |
| Admin | Yes | Standard confirmation |
| Agent / others | Yes | Same confirmation flow |

Deletion of **other users** is a separate admin action (team disable/remove), not covered by self-delete API.

---

## Owner deletion guards

Deletion request **rejected (409)** when:

| Guard | Check |
|-------|--------|
| Active subscription | `agencies.subscription_status` in `active`, `trialing` |
| Other users | More than one row in `users` for `agency_id` |
| Active agreements | Agreements not `cancelled` / `expired` |
| Pending approvals | Status in `draft`, `pending`, `in_review`, `awaiting_client` |
| Pending statements | Future: `service_statements` not `finalized` / `issued` |

---

## Confirmation flow

1. User opens **Settings → Security → Account**.
2. Enters **current password**.
3. If MFA enrolled: enters **TOTP code** (verified via Supabase MFA challenge).
4. Types exactly: `DELETE MY ACCOUNT`.
5. Submits → API `POST /api/security/account/delete-request`.

On success:

- `users.deleted_at` set, `is_active = false`
- `security_audit_logs` event recorded
- Global sign-out (`signOut({ scope: 'global' })`)

**Hard delete** of `auth.users` and PII purge is a separate ops runbook (not automatic in v1).

---

## MFA requirement

If `users.mfa_enabled` is true, MFA verification is required before deletion proceeds.

Owners/admins with **mandatory MFA** must have TOTP enrolled (see MFA policy).

---

## Data retention

| Data | After soft delete |
|------|-------------------|
| Agreements / approvals | Retained for agency compliance retention |
| Audit logs | Retained with `user_id` reference |
| Auth user | Remains until admin purge (prevents orphan re-login) |

Agency owners transferring practice should **transfer ownership** before deletion, not delete with active matters.

---

## API

- **Route:** `POST /api/security/account/delete-request`
- **Body:** `{ password, confirmText, mfaCode?, factorId? }`
- **Responses:** `200` soft delete initiated; `409` guard failure; `401` bad password/MFA

---

## Implementation status

| Item | Status |
|------|--------|
| Policy documented | **PASS** |
| API + guards | **Implemented** — needs E2E |
| UI (Security Center) | **Implemented** — needs browser test |
| Hard delete / GDPR export | **FAIL** — not in scope |

---

## Verification checklist

- [ ] Owner with active Stripe sub → deletion blocked
- [ ] Owner with second user → blocked
- [ ] Owner with sent agreement → blocked
- [ ] Agent with MFA → requires TOTP
- [ ] Successful delete → `deleted_at` in DB + audit row + logout

**Policy status: PARTIAL** until all checklist items have DB + API + browser evidence.
