# Agreement Gap Analysis — Rajwant Feedback vs Production

**Date:** 2026-06-21  
**Production:** https://immisign.vercel.app (commit `f69c722`)  
**Source of truth:** AVC Service Agreement PDF + Rajwant Singh feedback  
**Overall:** **GAP — local fixes exist, production unchanged**

---

## Summary

| # | Rajwant item | Production (today) | Local (uncommitted) | Gap |
|---|--------------|-------------------|---------------------|-----|
| 1 | Matter types: Visa Application, ART Appeal, Skill Assessment, PSA, JRP | Legacy types (Partner Visa, Student Visa, etc.) | AVC types seeded + legacy archived | **YES** |
| 2 | Remove File / Lodgement Ref | Still in Matter step + PDF | Removed | **YES** |
| 3 | Client identity on execution/send only | Client step has phone/address; matter has applicant DOB | Client = pick only; execution on Send | **YES** |
| 4 | Block-based professional fees | Flat table (Description, Due Trigger, Category, Notes) | Block 1/2/3 + GST included amount | **YES** |
| 5 | Add Row → Block 2, Block 3… | Generic unnamed rows | Auto-numbered blocks | **YES** |
| 6 | GST — professional included, gov not | Wrong categorization (disbursements) | Separate sections + labels | **YES** |
| 7 | Government Fees — First/Second/Additional VAC | Mixed / missing | Dedicated section | **YES** |
| 8 | Hide $0 totals | Shows Disbursements $0, Government $0 | Conditional totals only | **YES** |
| 9 | Never "No clauses configured" | Empty if agency has no clauses | `ensureAvcAgreementDefaults()` + migration | **YES** |
| 10 | Template auto-populates agency/agent/client/matter | Partial | Full in `agreement-preview-html.ts` | **YES** |
| 11 | Agent block auto-populated, no manual sign | "Sign here" for agent | Name, MARN, Agency, Date only | **YES** |
| 12 | SignWell failure — retry, preserve PDF | Throws hard error | Partial-success UI + saved draft | **YES** |

---

## Production verification method

Because production serves old code, verification was performed by:

1. **Git diff** — agreement wizard files changed locally, not on `origin/main`  
2. **Public site fetch** — marketing page only; wizard requires auth  
3. **Prior E2E evidence** — `docs/e2e-evidence/agreement-production.json` reflects old fee table UX  

**No production browser PASS for Agreement Rebuild V2 items until deploy.**

---

## Local implementation inventory

| Component | File(s) |
|-----------|---------|
| Matter types + clauses constants | `src/features/agreements/constants/avc-standard.ts` |
| Runtime seed | `src/features/agreements/lib/ensure-avc-defaults.ts` |
| Fee blocks + VAC | `src/features/agreements/lib/fee-items.ts`, `FeesStep.tsx` |
| Matter / Client / Send steps | `MatterStep.tsx`, `ClientStep.tsx`, `SendStep.tsx` |
| PDF structure | `agreement-preview-html.ts` |
| SignWell partial success | `agreement-wizard.tsx`, `SendStep.tsx`, `standard/route.ts` |
| DB migration | `supabase/migrations/20260622100000_agreement_rebuild_v2.sql` |

---

## Remaining risks after deploy

1. **Migration not applied** — legacy matter types remain visible until migration + `ensureAvcAgreementDefaults` run  
2. **PDF visual match** — requires side-by-side review with approved AVC PDF (not automated PASS)  
3. **SignWell quota** — partial-success path must be verified when limit hit  
4. **Existing draft agreements** — legacy `feeItems` migrated via `normalizeProfessionalBlocksFromForm()`  

---

## Definition of done (not met)

- [ ] Production browser: matter types show only AVC categories  
- [ ] Production browser: fees block UI  
- [ ] Production PDF compared to AVC agreement  
- [ ] Production SignWell or partial-success retry verified  
- [ ] Database: `agreement_clauses` populated per agency  

**Verdict: GAP CLOSED in code — OPEN on production until deploy + E2E.**
