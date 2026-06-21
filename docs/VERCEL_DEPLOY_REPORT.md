# Vercel Deploy Report — IMMISIGN-PRODUCTION-CLOSURE-MASTER-1

**Date:** 2026-06-14  
**Production URL:** https://immisign.vercel.app  
**Project:** kartik-singhhh03s-projects/immisign  

## Deployments

| Deploy | URL | Status |
|--------|-----|--------|
| Latest (closure fixes) | https://immisign-8gektmty4-kartik-singhhh03s-projects.vercel.app | **SUCCESS** |
| Aliased | https://immisign.vercel.app | **ACTIVE** |

## Build

- Next.js 14.2.35 — compiled successfully on Vercel (iad1)
- Build time ~38s
- All 107 static/dynamic routes generated

## Environment Variables (Vercel Production)

Verified present (encrypted on Vercel):

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_WEBHOOK_SECRET`
- `SIGNWELL_API_KEY` / `SIGNWELL_WEBHOOK_ID` / `SIGNWELL_TEST_MODE`
- Stripe keys (billing)

**Note:** `vercel env pull` returns empty strings locally (encrypted secrets not decrypted via CLI). Use Supabase CLI or Vercel dashboard for local E2E credentials.

## Code Changes Deployed (Post f69c722)

- `vercel.json` — Chromium `includeFiles` for `/api/agreements/[id]/generate`, `regenerate`, `preview-pdf`
- `next.config.mjs` — `outputFileTracingIncludes` for document send routes
- `agreement-wizard.tsx` — draft reset race fix (`draftReady` gating)
- `agreements/new/page.tsx` — wizard remount key for fresh vs resume

## Production Smoke

| Check | Result |
|-------|--------|
| https://immisign.vercel.app/login | HTTP 200 |
| PDF generate API on Vercel | **PASS** (Chromium bundled) |
| Application Approval send | **PASS** |
| Agreement SignWell send | **FAIL** — SignWell API plan limit (external blocker) |

## Next Action

1. Upgrade SignWell API plan or contact support@signwell.com
2. Re-run `node scripts/agreement-production-e2e.mjs` after SignWell restored
3. Push latest local E2E script fixes (approval wizard search) — no app redeploy required for approval PASS
