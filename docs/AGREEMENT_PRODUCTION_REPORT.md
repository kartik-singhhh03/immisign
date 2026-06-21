# Agreement Production Report

**Date:** 2026-06-21  
**Environment:** https://immisign.vercel.app  
**Deployed commit:** `f69c722`  
**Release under test:** Agreement Rebuild V2 (local, uncommitted)  
**Overall:** **FAIL — not on production**

---

## Test matrix

| Step | Production | Notes |
|------|------------|-------|
| Create agreement wizard | **UNKNOWN** | Old wizard on prod |
| Matter types (AVC only) | **FAIL** | Legacy types on prod |
| Fees block UI | **FAIL** | Old table UX on prod |
| Remove lodgement ref | **FAIL** | Still on prod |
| Clauses auto-seed | **FAIL** | Empty state possible |
| Generate PDF / Preview | **PASS** (prior) | Generic layout, not AVC blocks |
| Send / SignWell | **PARTIAL** | SignWell quota blocker historically |
| SignWell failure retry | **FAIL** | Not on prod |
| Agent auto-populate in PDF | **FAIL** | Manual sign box on prod |

---

## Evidence

| Artifact | Path |
|----------|------|
| Prior production E2E JSON | `docs/e2e-evidence/agreement-production.json` |
| Screenshots | `docs/e2e-evidence/agreement-production-screenshots/` |
| Rebuild implementation report | `docs/AGREEMENT_REBUILD_V2_REPORT.md` |
| Gap analysis | `docs/AGREEMENT_GAP_ANALYSIS.md` |

---

## Post-deploy test plan

1. Apply `20260622100000_agreement_rebuild_v2.sql`  
2. Deploy commit containing agreement rebuild  
3. Run `node scripts/agreement-production-e2e.mjs https://immisign.vercel.app <agencySlug>`  
4. Manual PDF compare vs `AVC Service Agreement 2026*.pdf`  
5. Update this report with PASS/FAIL per step + screenshots  

**Verdict: FAIL until production deploy and E2E complete.**
