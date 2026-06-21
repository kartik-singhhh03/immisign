# Pre-Push Review — Files That Would Be Deployed

**Generated:** 2026-06-21  
**Current production commit:** `f69c722` (origin/main)  
**Local state:** Large uncommitted set — **nothing from this release is on production yet**

---

## ⚠️ Review before Vercel auto-deploy

Production at https://immisign.vercel.app still serves **f69c722**. Pushing `main` will deploy everything below.

---

## Modified files (27 tracked changes)

| File | Area |
|------|------|
| `docs/AGREEMENT_PRODUCTION_REPORT.md` | Docs / evidence |
| `docs/APPLICATION_APPROVAL_PRODUCTION_REPORT.md` | Docs / evidence |
| `docs/e2e-evidence/agreement-production.json` | E2E evidence |
| `docs/e2e-evidence/application-approval-production.json` | E2E evidence |
| `next.config.mjs` | Build (Chromium/PDF) |
| `vercel.json` | Deploy config |
| `scripts/application-approval-e2e.mjs` | E2E script |
| `src/app/api/agreements/standard/route.ts` | Agreement send API |
| `src/app/api/clients/[id]/audit-events/route.ts` | Audit enrichment API |
| `src/app/workspace/[agency]/agreements/new/page.tsx` | Agreement wizard page |
| `src/features/agreements/**` (wizard, fees, PDF, types) | **Agreement Rebuild V2** |
| `src/features/approvals/**` (service, audit, portal, detail) | **Approval audit hardening** |
| `src/features/clients/components/ClientAuditPanel.tsx` | Audit UI |
| `src/lib/email/resend.ts` | Branded email sender |

## New files (must be included for release)

| File | Area |
|------|------|
| `src/features/approvals/lib/application-approval-audit.ts` | Audit helper |
| `src/features/approvals/services/approval-record.service.ts` | Approval record PDF |
| `src/features/agreements/constants/avc-standard.ts` | AVC matter types + clauses |
| `src/features/agreements/lib/ensure-avc-defaults.ts` | Runtime clause/matter seed |
| `supabase/migrations/20260616100000_application_approval_enhancements.sql` | **Migration — apply before/alongside deploy** |
| `supabase/migrations/20260622100000_agreement_rebuild_v2.sql` | **Migration — apply before/alongside deploy** |
| `src/app/api/application-approvals/[id]/record/` | Approval record download API |
| `scripts/backfill-application-approval-audit.mjs` | Legacy audit backfill |
| `scripts/application-approval-compliance-e2e.mjs` | Compliance E2E |
| `scripts/migration-audit.mjs` | Migration audit tool |
| `scripts/security-audit.mjs` | Security audit tool |
| `docs/AGREEMENT_REBUILD_V2_REPORT.md` | Agreement rebuild report |
| `docs/e2e-evidence/**` (screenshots, JSON) | Evidence artifacts |

## Must NOT commit

| File | Reason |
|------|--------|
| `.env.local.restored` | Local secrets |
| `.env.vercel` | Vercel env dump |
| `.env.local` | Secrets (already gitignored) |
| `.next/` | Build output |

---

## Recommended push scope

**Single release commit** containing:
- Approval audit hardening (Phase 1)
- Agreement Rebuild V2 (Phase 2)
- Migrations (Phase 3)
- Audit/security scripts + reports (Phases 3–4)

**After push:** Apply pending Supabase migrations, then run production E2E (Phase 7).

---

## Diff size

~2,663 insertions / 821 deletions across 27 modified tracked files (+ ~30 new files).
