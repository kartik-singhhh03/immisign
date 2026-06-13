# Agreement Production Report

**Task:** IMMIMATE — Agreement Module Production Closure  
**Timestamp:** 2026-06-13  
**Production URL:** https://immisign.vercel.app  
**Agency:** ritiklabs  
**Overall:** **FAIL (deploy required)**

## Summary

| Environment | Result | Notes |
|-------------|--------|-------|
| Local production build (`next start`, strict E2E) | **PASS** | 0 FAIL, 0 WARN — full wizard → Send → SignWell → webhook |
| Vercel production (current deploy) | **FAIL** | PDF generate API broken (Chromium bundle); draft-clear fix not deployed |

## Local Strict E2E (verified)

All checks passed against local production build on port 3014:

- **Wizard:** New → Client → Matter → resume draft → fresh new (Step 1)
- **PDF:** agreements row, documents row, Storage object, download
- **Send:** `WIZARD_REACHED_SEND=PASS`, timeline sequential, success card, no full overlay
- **SignWell:** draft ID, API visible, webhook 200, `payload_hash` in `webhook_events`
- **Dashboard:** Quick actions, pipeline widgets match DB, console clean
- **Activity / notifications:** DB verified after send

Evidence: `docs/e2e-evidence/agreement-dashboard-e2e.json`  
Screenshots: `docs/e2e-evidence/agreement-dashboard-screenshots/`

## Production Vercel Failures

| Check | Result | Root cause |
|-------|--------|------------|
| `NEW_AGAIN_STEP1` | FAIL | Latest wizard draft-clear logic not on Vercel |
| `GENERATE_API` | FAIL | `@sparticuz/chromium/bin` missing in serverless bundle for `/api/agreements/[id]/generate` |
| Wizard send (PART3) | Not reached | Script aborted after generate failure |

**Fix applied (not yet deployed):** `next.config.mjs` — added `outputFileTracingIncludes` for generate/regenerate/preview-pdf routes.

## GitHub Hardening

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm run lint` | Pre-existing warnings in unrelated files |
| Secrets in git | `.env.local` not tracked |

## Required Before Production PASS

1. **Deploy** latest `main` (uncommitted agreement + dashboard + approval rebuild changes)
2. Re-run: `node scripts/agreement-production-e2e.mjs`
3. Confirm dashboard load **<2s** on Vercel (strict mode enforces 2000ms on production)

## Status Assessment

| Module | Status |
|--------|--------|
| Application Approval | PASS (local E2E); production re-verify after deploy |
| Agreement Module | **PASS locally** — production **blocked on deploy** |
| Dashboard | **PASS locally** — production **blocked on deploy** |
