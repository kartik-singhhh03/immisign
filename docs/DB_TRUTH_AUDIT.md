# Database Truth Audit

**Date:** 2026-06-03  
**Evidence:** `docs/verification-screenshots/production-stabilization/production-truth-audit.json`  
**Agency tested:** `abc-lab` (production DB via `.env.local`)

---

## Method

1. Postgres queries (`scripts/production-truth-audit.mjs`)
2. Repo-wide scan for `mock`, `demo`, `fake`, `placeholder`, hardcoded metrics
3. Code fixes applied where UI showed values not backed by DB

**Nothing marked PASS from code inspection alone.**

---

## Production DB counts (`abc-lab`)

| Table | Rows |
|-------|------|
| matter_types | **2** (`visa`, `student visa`) |
| documents | **6** |
| clients | **2** |
| agreements | **3** |
| users | **1** |

Sample document row (real):

- `file_name`: `screencapture-skymanufacturing-2026-06-02-01_15_15.pdf`
- `file_size`: `1721352` bytes
- `mime_type`: `application/pdf`
- `signwell_status`: `null`

---

## Findings — fake / hardcoded UI (fixed in repo)

| Location | Was | Fix |
|----------|-----|-----|
| `DocumentLibraryPage` modal | DHA Compliant, SHA-256 hash, fake audit log, fake downloads | Removed; show `signwell_status`, `mime_type`, `file_size`, `created_at`, bucket |
| `DocumentLibraryPage` stats | 18.4 MB, 3 recent uploads, 4 subclasses | Computed from `documents` list + count |
| `DashboardHomePage` KPIs | `+12%`, `+18%` fake deltas | Removed; labels reflect DB sums |
| `NewAgreementPage` success | Fake `HASH: SHA-256#...` | Replaced with real `agreementId` when present |

---

## Remaining items (not production UI paths)

| Item | Severity | Notes |
|------|----------|-------|
| `src/store/demoStore.ts` | Low | Legacy store; not wired to workspace routes |
| `SendDocumentPage` `mockEmailTemplates` | Low | Email **template presets** (copy), not DB fields |
| Marketing pages SHA-256 marketing copy | OK | Public marketing only |
| `poc/generate-pdf` | Low | POC route only |

---

## API evidence (production `immisign.vercel.app`)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/dashboard/summary` | **200** | JSON; real counts; warning on enum `awaiting_signature` |
| `GET /api/agreements/wizard-draft` | **401** | Bearer-only test; browser uses cookies (expected) |

---

## Result

| Area | Status |
|------|--------|
| Core workspace data in DB | **PASS** (verified) |
| Document library modal truth | **PASS** after deploy |
| Dashboard fake deltas | **PASS** after deploy |
| Legacy demo store removed from routes | **PASS** |

**Deploy required** for UI fixes to appear on Vercel.
