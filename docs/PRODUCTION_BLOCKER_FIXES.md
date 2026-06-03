# Production Blocker Fixes (from Vercel screenshots)

**Date:** 2026-06-04  
**Environment:** `https://immisign.vercel.app` / workspace `avc-migration-live`

---

## Issues observed (browser evidence)

| # | Symptom | Root cause | Fix |
|---|---------|------------|-----|
| 1 | Document Library — "Something went wrong" | `documentsList` used **before** `useDocuments()` hook (TDZ ReferenceError) | Reordered hooks in `DocumentLibraryPage.tsx` |
| 2 | Send Document — `ENOENT ... chromium.br` | Wrong Chromium path on Vercel serverless | Use default `chromium.executablePath()` on Vercel; add `includeFiles` for `documents/send` routes in `vercel.json` |
| 3 | Agreement send — invalid UUID `22222222-...-223` | Zod `.uuid()` rejects non-RFC seed IDs used by demo `Agent User` | `isUuid()` now uses Postgres hex UUID regex |
| 4 | Send email preview — fake SHA-256 / OMARA claims | Marketing copy in preview panel | Replaced with factual signer messaging |
| 5 | Signup — "Workspace slug already taken" | Expected when slug collides (e.g. existing `kartik-labs`) | User must pick unique slug or use invite flow (no code change) |

---

## Deploy required

These fixes are in the repository. **Redeploy Vercel** before re-testing.

After deploy, verify:

1. `/workspace/avc-migration-live/documents/library` — loads list
2. `/workspace/avc-migration-live/documents/send` — dispatch completes (or clear SignWell error, not 502/chromium)
3. `/workspace/avc-migration-live/agreements/new` — send agreement as Agent User

---

## Agent User note

If `agent@demoagency.com` (seed UUID `22222222-2222-2222-2222-222222222223`) is used on production, agreements will work after UUID fix. For long-term production, use real Supabase auth users (e.g. `kartiksingh37193@gmail.com` owner on `abc-lab`).

---

## Status (post-fix, pre-deploy)

| Module | Expected after deploy |
|--------|----------------------|
| Document Library | **PASS** |
| Agreement send (seed UUID users) | **PASS** |
| Send document PDF | **PASS** if Chromium bundles; else check Vercel function size |
| SignWell duplicate CC | **PASS** if prior SignWell fixes deployed |
