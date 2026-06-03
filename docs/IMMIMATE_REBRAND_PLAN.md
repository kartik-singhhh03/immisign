# ImmiSign → ImmiMate Rebrand Plan (Phase 16F)

**Date:** 2026-06-03  
**Rule:** Do not rename APIs, Stripe products, or env keys blindly.

---

## Inventory summary

Approximate references (repo-wide grep):

| Pattern | ~Count | Notes |
|---------|--------|-------|
| `ImmiSign` | 40+ files | UI copy, docs, emails |
| `immisign` | 30+ files | slugs, env vars, package name |
| `IMMISIGN` | env examples | Production secrets |

---

## Classification

### Safe to rename (no breaking change)

| Area | Examples | Action |
|------|----------|--------|
| Marketing copy | `src/app/(marketing)/page.tsx`, `marketing-pages.tsx` | ImmiMate branding |
| Auth layout titles | `src/app/(auth)/layout.tsx` | Display name |
| README / docs | User-facing guides | Gradual update |
| Email templates subject lines | `welcome.tsx`, `invitation.tsx` | Copy only |
| Dashboard labels | Placeholder pages | Copy only |

### Requires migration (coordinated)

| Area | Examples | Action |
|------|----------|--------|
| `package.json` name | `immisign` | npm/package rename optional |
| Supabase project display name | Console only | Manual |
| Vercel project URL | `immisign.vercel.app` | New domain alias + redirect |
| Database seed text | `agencies` branding JSON | SQL update script |
| Stripe product/price IDs | `immisign` plan scripts | Create ImmiMate products; map subscriptions |
| Env vars | `IMMISIGN_*` in `.env.example` | Add `IMMIMATE_*` aliases; deprecate old |

### Domain dependent

| Item | Risk |
|------|------|
| `immisign.vercel.app` | Bookmarks, SignWell callbacks, Resend links |
| Custom domain (if any) | DNS + SSL |
| Magic link redirect URLs | Must match Supabase allow list |
| OAuth redirect URIs | Google Cloud console |

### Database dependent

| Item | Notes |
|------|-------|
| `supabase/migrations/20260603100000_immisign_single_plan_billing.sql` | Historical filename — do not rename applied migration |
| `agencies.slug` | User-facing URLs like `/workspace/abc-lab` — **do not mass-rename** |
| Email templates stored in DB | If any, update via admin script |

### Do NOT rename blindly

| Item | Reason |
|------|--------|
| API route paths | `/api/*` stable for integrations |
| SignWell webhook URL path | External config |
| Stripe webhook secret env | Breaks billing |
| `NEXT_PUBLIC_*` keys mid-deploy | Client bundle mismatch |
| Git remote / folder name | Low priority |

---

## Phased rollout

| Phase | Work |
|-------|------|
| R0 | Document-only (this file) + dual-brand UI ("ImmiMate powered by…") optional |
| R1 | User-visible strings in app shell, login, emails |
| R2 | New env aliases `IMMIMATE_APP_NAME`; keep old vars reading as fallback |
| R3 | Stripe new products "ImmiMate Pro"; migrate existing subscribers manually |
| R4 | Domain: `immimate.app` + 301 from old |
| R5 | Remove ImmiSign strings; archive old Stripe products |

---

## File hotspots

```
src/app/layout.tsx
src/app/(auth)/login/page.tsx
src/components/saas/marketing-pages.tsx
src/lib/stripe/plan.ts, plans.ts
src/lib/email/resend.ts
.env.example, .env.production.example
package.json
scripts/stripe-setup-immisign-plan.mjs  → create immimate variant
```

---

## Verification after each phase

- [ ] Login page shows ImmiMate
- [ ] Emails send with correct from-name
- [ ] Stripe checkout still completes
- [ ] SignWell webhook still 200
- [ ] No broken absolute URLs in production

---

## Phase 16F result: **PASS** (plan complete) — execution **FAIL** until phased rollout done
