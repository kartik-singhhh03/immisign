# RSD-1 — Resend Production Email Verification

**Phase:** RSD-1  
**Date:** 2026-06-10  
**FROM address:** `notifications@immimate.au`  
**Verified domain:** `immimate.au` (Resend dashboard)

---

## Overall verdict: **PARTIAL PASS**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Resend dashboard shows sent email | **PASS** | Resend accepted `id=353af68a-dcc5-4076-bb67-917bfdea4fb8` |
| Resend API `last_event=delivered` | **PASS** | Polled via `GET /emails/{id}` after send |
| Email reaches inbox | **PENDING** | Sent to `nayramalik1018@gmail.com` — **confirm in Gmail manually** |
| `email_delivery_audit` table | **FAIL** | Migration not applied (pooler ENOTFOUND) |

No code-inspection PASS for delivery — Resend API poll confirms **delivered** status.

---

## STEP 1 — Resend diagnostic route

`GET /api/debug/resend` (Owner/Admin)

**Live probe (2026-06-10):**

```json
{
  "healthy": true,
  "domain": "immimate.au",
  "domainStatus": "verified",
  "fromEmail": "notifications@immimate.au",
  "apiConnected": true
}
```

---

## STEP 2 — Real test email

`POST /api/debug/resend/send-test` with `{ "email": "..." }`

**Automated run:** `node scripts/rsd1-verify.mjs`

| Field | Value |
|-------|-------|
| Recipient | `nayramalik1018@gmail.com` |
| Subject | ImmiMate Email Verification |
| Resend ID | `353af68a-dcc5-4076-bb67-917bfdea4fb8` |
| Resend status (polled) | **delivered** |

Also available in **System Health → Send test email** (browser).

---

## STEP 3 — Email audit table

**Migration:** `supabase/migrations/20260619100000_rsd1_email_delivery_audit.sql`

**Status:** NOT APPLIED — apply in Supabase SQL Editor.

After apply, every `sendEmailWithForensicLogging()` call records a row. Resend webhooks update `delivered_at` on `email.delivered`.

---

## STEP 4 — Existing email flows

| Flow | Code path | DB evidence this run |
|------|-----------|----------------------|
| Team Invite | `POST /api/team/invite` → `sendEmailWithForensicLogging` | Audit after migration |
| Password Reset | `email_jobs` type `password_reset` | Not re-run this session |
| Agreement Sent | `email_jobs` type `agreement_sent` | SignWell path — not re-run |
| Approval Notification | `sendTransactionalEmail` | Not re-run this session |
| SOS Notification | `sendTransactionalEmail` | Not re-run this session |

All flows now route through `sendEmailWithForensicLogging` with `emailType` tagging once audit table exists.

---

## STEP 5 — Email Health dashboard

**Location:** `/workspace/ritiklabs/admin/system-health`

Displays:
- Domain verified (`immimate.au`)
- API connected
- Last email sent / delivered
- Failed emails (24h)
- Send test email form

---

## STEP 6 — Evidence

| Artifact | Path |
|----------|------|
| Resend domain verified | `docs/rsd1-screenshots/01-resend-domain-verified.png` |
| Inbox screenshot | **PENDING** — capture after confirming Gmail delivery |
| Audit table rows | **BLOCKED** — apply migration first |
| System Health page | **PENDING** — browser screenshot |
| API probe results | `docs/e2e-evidence/rsd1-verify-results.json` |

---

## Action required

1. **Apply SQL** in Supabase Dashboard:

```
supabase/migrations/20260619100000_rsd1_email_delivery_audit.sql
```

2. **Confirm inbox** — check `nayramalik1018@gmail.com` for “ImmiMate Email Verification”.

3. **Capture screenshots:**
   - Resend → Emails tab showing test send
   - Gmail inbox
   - System Health email panel

4. **Optional:** Set `NEXT_PUBLIC_APP_URL` to your ngrok URL if using ngrok on :3000 for webhooks.

---

## Re-run verification

```bash
node scripts/rsd1-verify.mjs your@email.com
```

**PASS when:** inbox confirmed + audit rows visible + Resend dashboard shows delivered.
