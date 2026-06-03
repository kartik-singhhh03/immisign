# Invite Flow E2E (Phase 16.6F)

**Date:** 2026-06-03

---

## Historical production evidence (database)

Accepted invitation exists — proves prior end-to-end success:

```json
{
  "email": "practitioner.1780342052074@gmail.com",
  "role": "agent",
  "accepted_at": "2026-06-01T19:27:49.544Z",
  "created_at": "2026-06-01T19:27:42.204Z"
}
```

Query: `scripts/phase16-6-query-invites.mjs`

Corresponding `users` row exists for same email in agency `avc-migration-live` / shared DB — **PASS** (historical).

---

## Automated run (2026-06-03)

Script: `scripts/phase16-6-invite-e2e.mjs`  
Report: `docs/verification-screenshots/phase16-6/invite-e2e.json`

| Step | Result | Notes |
|------|--------|-------|
| Invite row created | **PASS** | Service role insert |
| `POST /api/auth/accept-invite` | **FAIL** | Supabase `email rate limit exceeded` on `signUp` |
| `users` row | **FAIL** | Blocked by rate limit |
| `invitations.accepted_at` | **FAIL** | — |
| `security_audit_logs` invite.accepted | **PARTIAL** | — |
| Supabase Auth user | **FAIL** | — |
| Login after accept | **FAIL** | — |

---

## Fix applied during 16.6 (invite hardening)

**Issue:** Anonymous accept could not read `invitations` under RLS.  
**Fix:** Fetch and mark invitation via `createAdminClient()` in `accept-invite/route.ts` (server-side only; role still from invite row).

---

## Password policy on accept

| Check | Result |
|-------|--------|
| `validatePassword` on API | **PASS** (code) |
| Invite form `minLength={12}` | **PASS** (code) |

---

## Resend / email delivery

| Check | Result |
|-------|--------|
| Resend API on team invite | **PARTIAL** — not re-run in 16.6; prior phase scripts exist |
| Automated accept email | Blocked by Supabase rate limit in test |

---

## Orphan check

| Check | Result |
|-------|--------|
| Accepted invites without `users` row | **0** — **PASS** |

---

## Phase 16.6F verdict: **PARTIAL**

| Evidence type | Result |
|---------------|--------|
| Historical DB accept | **PASS** |
| Fresh automated E2E (today) | **FAIL** (rate limit) |
| RLS fix | **PASS** (code, pending re-test after rate limit cooldown) |

**Re-test:** Wait for Supabase auth rate limit reset, or use `admin.auth.admin.createUser` in accept path (future hardening).
