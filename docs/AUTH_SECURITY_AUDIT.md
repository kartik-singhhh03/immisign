# Authentication & Security Audit

**Date:** 2026-06-03  
**Scope:** Phase E requirements — evidence-based only

---

## Auth flows

| Flow | Browser | API | DB / Supabase | RLS | Overall |
|------|---------|-----|---------------|-----|---------|
| Login | **PASS** | Supabase Auth | **PASS** | N/A | **PASS** |
| Signup | **PARTIAL** | **PARTIAL** | **PASS** | N/A | **PARTIAL** |
| Invite accept | **PARTIAL** | **PARTIAL** | **PASS** | **PASS** | **PARTIAL** |
| Email verification | **PARTIAL** | Supabase | **PARTIAL** | N/A | **PARTIAL** |
| Forgot password | **PARTIAL** | Supabase | **PASS** | N/A | **PARTIAL** |
| Reset password | **PARTIAL** | Supabase | **PASS** | N/A | **PARTIAL** |
| Change password | **PARTIAL** | **FAIL** | **PASS** | N/A | **PARTIAL** |
| Delete account | **FAIL** | **FAIL** | N/A | N/A | **FAIL** |
| Logout | **PASS** | **PASS** | N/A | N/A | **PASS** |
| Session expiry | **PARTIAL** | Middleware | **PASS** | N/A | **PARTIAL** |
| Refresh tokens | **PASS** | Supabase SDK | **PASS** | N/A | **PASS** |
| Remember me | **FAIL** | Not implemented | N/A | N/A | **FAIL** |
| MFA (TOTP) | **FAIL** | **FAIL** | Column only | N/A | **FAIL** |

---

## Security requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Supabase Auth only | **PASS** | No custom password table |
| Passwords not stored manually | **PASS** | `auth.users` only |
| Email verification required | **PARTIAL** | Supabase config-dependent |
| Password policy 12+ chars mixed | **FAIL** | Not enforced in signup UI/API |
| HIBP breach check | **FAIL** | Not implemented |

---

## MFA

| Requirement | Status |
|-------------|--------|
| TOTP / authenticator apps | **FAIL** — not implemented |
| Recovery / backup codes | **FAIL** |
| MFA required Owner/Admin | **FAIL** — Settings toggle updates `users.mfa_enabled` only (UI flag) |

---

## Session security

| Requirement | Status |
|-------------|--------|
| Secure cookies | **PASS** (Supabase SSR) |
| Token rotation | **PASS** (Supabase) |
| Session revocation | **PARTIAL** |
| Device tracking | **FAIL** |
| Last login / history | **FAIL** |
| Suspicious login detection | **FAIL** |
| Force logout all sessions | **FAIL** |

---

## Account deletion

| Requirement | Status |
|-------------|--------|
| Owner guards (subscription, users, agreements) | **FAIL** |
| Password + MFA confirmation | **FAIL** |
| Soft delete + audit log | **FAIL** |

---

## RBAC

| Layer | Status |
|-------|--------|
| UI (`route-access`, nav locks) | **PASS** |
| API (`getWorkspaceApiContext`, approval service) | **PASS** |
| RLS (`get_tenant()`) | **PASS** (Phase 15 DB audit) |

---

## Audit logging

| Event | Status |
|-------|--------|
| login / logout | **PARTIAL** (`activity_logs` some flows) |
| password reset/change | **FAIL** |
| MFA enable/disable | **FAIL** |
| invite / role change / session revoke | **FAIL** |
| Structured security audit table | **FAIL** |

---

## Settings integration

| Page | Persisted | Status |
|------|-----------|--------|
| Agency profile | Yes (`agencies`) | **PASS** (screenshot matches DB fields) |
| MFA toggle | `users.mfa_enabled` only | **PARTIAL** |
| Sessions | Not implemented | **FAIL** |
| Notifications prefs | Yes | **PASS** |

---

## Summary

Enterprise-grade auth (Phase E full spec) is **not production-ready**.

**Safe today:** Supabase login/logout, tenant RLS, API role checks.

**Not safe to claim:** MFA, HIBP, device tracking, account deletion guards, security audit log.

**Recommendation:** Treat Phase E as a **follow-on project** after deploying Phase A–D truth + SignWell fixes. Do not mark MFA PASS without TOTP enrollment flow and Supabase MFA enabled.

---

## Overall Phase E result: **FAIL** (with **PARTIAL** on core login + RBAC)
