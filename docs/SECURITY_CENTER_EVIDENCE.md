# Security Center Evidence (Phase 16.6C)

**Date:** 2026-06-03  
**Workspace:** `abc-lab`  
**Owner test user:** `kartiksingh3337@gmail.com`  
**Local base URL:** `http://localhost:3001`

---

## Browser verification

Magic-link login → Settings → Security tabs.

| Tab | Screenshot | Result |
|-----|------------|--------|
| Profile | `docs/verification-screenshots/phase16-6/security-profile.png` | **PASS** |
| Password | `security-password.png` | **PASS** |
| MFA | `security-mfa.png` | **PASS** |
| Sessions | `security-sessions.png` | **PASS** |
| Security Logs | `security-logs.png` | **PASS** |
| Account Management | `security-account.png` | **PASS** |

Manifest: `docs/verification-screenshots/phase16-6/browser-manifest.json`

---

## API verification (authenticated owner JWT)

| Endpoint | HTTP | Result |
|----------|------|--------|
| `GET /api/security/audit-logs` | 200 | **PASS** |
| `GET /api/security/mfa/status` | 200 | **PASS** |
| `GET /api/security/sessions` | 200 | **PASS** |
| `POST /api/security/login-event` | 200 | **PASS** |

Source: `phase16-6-verification-local.json` → `securityCenter`

---

## Database / audit evidence

After `POST /api/security/login-event` with `login.success`:

| Field | Sample value |
|-------|----------------|
| `event_type` | `login.success` |
| `user_id` | `f49335d8-456b-467d-8fc1-23ab121559b1` |
| `device_label` | `Desktop` |
| `browser_label` | `Browser` |
| `created_at` | `2026-06-03T20:39:54.815408+00:00` |

`GET /api/security/audit-logs` returned ≥1 row after login event — **PASS**.

---

## Production gap

| Endpoint (Vercel) | HTTP | Result |
|-------------------|------|--------|
| `/api/security/*` | 404 (HTML) | **FAIL** |

Source: `phase16-6-verification-production.json`

**Action required:** Deploy latest `main` to Vercel, then re-run browser + API checks on `https://immisign.vercel.app`.

---

## Phase 16.6C verdict

| Environment | Result |
|-------------|--------|
| Local | **PASS** (browser + API + DB audit row) |
| Production | **FAIL** (not deployed) |
