# Agreement Rebuild V2 — Rajwant Feedback Report

**Task:** AGREEMENT-MODULE-REBUILD-RAJWANT-FINAL  
**Source of truth:** AVC Service Agreement PDF (Rajwant Singh, 18-Jun-2026)  
**Date:** 2026-06-06  
**Overall status:** IMPLEMENTED — pending browser/PDF/SignWell verification on deployed environment

---

## Summary

The agreement wizard, fee model, PDF preview, and dispatch flow were rebuilt to follow the AVC migration-agency workflow rather than a generic contract builder. Legacy drafts and agreements remain compatible via migration helpers in `fee-items.ts`.

---

## Feedback Items

| # | Feedback Item | Implementation | Browser | DB | PDF | Status |
|---|---------------|----------------|---------|-----|-----|--------|
| 1 | Matter types wrong (Partner Visa etc.) → Visa Application, ART Appeal, Skill Assessment, PSA, JRP | `AVC_MATTER_TYPES` in `avc-standard.ts`; migration `20260622100000_agreement_rebuild_v2.sql`; runtime `ensureAvcAgreementDefaults()` on wizard load | Pending | Pending | Pending | **IMPLEMENTED** |
| 2 | Remove File / Lodgement Ref | Removed from `MatterStep`, wizard types, PDF (`agreement-preview-html.ts`), API metadata | Pending | N/A | Pending | **IMPLEMENTED** |
| 3 | Move client identity to execution stage | `ClientStep` = selection only; `SendStep` = First/Middle/Last/DOB/Address/Mobile/Email | Pending | Pending | Pending | **IMPLEMENTED** |
| 4 | Remove Due Trigger, Category, Notes from fees | `FeesStep.tsx` fully rewritten — block + government sections only | Pending | N/A | Pending | **IMPLEMENTED** |
| 5 | Professional fees block-based | `ProfessionalFeeBlockDraft[]`; UI shows Block 1, Block 2… with Description + Amount (GST included) | Pending | Pending | Pending | **IMPLEMENTED** |
| 6 | Add Row auto-numbers blocks | "Add Block N" button increments `blockNumber`; never creates unnamed rows | Pending | N/A | N/A | **IMPLEMENTED** |
| 7 | GST logic — professional GST-inclusive, visa fees not | Amount labelled "GST included"; government section note "not subject to GST"; persisted with `notes: 'GST included'` on professional rows | Pending | Pending | Pending | **IMPLEMENTED** |
| 8 | Government fees separate (First/Second/Additional VAC) | `GovernmentFeeDraft[]` with fixed VAC labels in dedicated section | Pending | Pending | Pending | **IMPLEMENTED** |
| 9 | Totals only when values exist | `FeesStep`, `WizardSidebar`, `PreviewStep`, PDF — conditional totals (no $0.00 lines) | Pending | N/A | Pending | **IMPLEMENTED** |
| 10 | Never show empty clauses screen | `ensureAvcAgreementDefaults()` + migration seeds `agreement_clauses` when missing | Pending | Pending | N/A | **IMPLEMENTED** |
| 11 | Standard AVC template sections auto-load | Eight standard clauses seeded (Appointment of Agent through Execution) | Pending | Pending | Pending | **IMPLEMENTED** |
| 12 | Template variables auto-populate | PDF builder uses agency/agent/client/matter/fee block values via `buildAgreementPreviewHtml` | Pending | N/A | Pending | **IMPLEMENTED** |
| 13 | Agent signature auto-populated — client only signs | Agent execution block shows Name, MARN, Agency, Date — no "Sign here" for agent | Pending | N/A | Pending | **IMPLEMENTED** |
| 14 | PDF output matches AVC agreement structure | Section 3 split Professional Fees / Government Charges; matter line format; execution block | Pending | N/A | Pending | **IMPLEMENTED** |
| 15 | SignWell failure — preserve PDF/draft, retry screen | API keeps agreement + PDF on SignWell error; wizard shows partial-success card with Retry + Open Agreement | Pending | Pending | N/A | **IMPLEMENTED** |

---

## Key Files Changed

| Area | Files |
|------|-------|
| Constants | `src/features/agreements/constants/avc-standard.ts` |
| Types | `src/features/agreements/types/wizard.ts` |
| Fee logic | `src/features/agreements/lib/fee-items.ts` |
| Defaults seed | `src/features/agreements/lib/ensure-avc-defaults.ts` |
| Wizard steps | `ClientStep`, `MatterStep`, `FeesStep`, `SendStep`, `PreviewStep`, `WizardSidebar` |
| PDF | `src/features/agreements/lib/agreement-preview-html.ts` |
| API | `src/app/api/agreements/standard/route.ts` |
| Migration | `supabase/migrations/20260622100000_agreement_rebuild_v2.sql` |
| Page load | `src/app/workspace/[agency]/agreements/new/page.tsx` |

---

## Verification Checklist (required before PASS)

- [ ] Run migration on target database
- [ ] Browser: complete wizard Client → Matter → Fees → Terms → Preview → Send
- [ ] Confirm matter types include Visa Application, ART Appeal, Skill Assessment, PSA, JRP
- [ ] Confirm File / Lodgement Ref absent at all steps
- [ ] Confirm execution fields only on Send step
- [ ] Confirm fee blocks auto-number; totals hide zero sections
- [ ] Generate preview PDF and compare visually to approved AVC PDF
- [ ] Test SignWell dispatch (or confirm partial-success retry UI when limit reached)
- [ ] Verify `agreement_fee_items` rows use `category: professional|government`
- [ ] Verify `agreement_clauses` populated for agency

---

## Backward Compatibility

- Legacy `feeItems[]` drafts migrate to `professionalFeeBlocks` via `normalizeProfessionalBlocksFromForm()`
- Existing agreements retain stored metadata; new sends use block structure
- Old matter types remain in DB (archived types not deleted); new AVC categories added alongside

---

## Notes

- Full production PASS requires deploy + browser test against `immisign.vercel.app` with Rajwant's AVC PDF side-by-side review.
- SignWell E2E may remain blocked by plan document limit; partial-success path (Issue 15) should be validated manually.
