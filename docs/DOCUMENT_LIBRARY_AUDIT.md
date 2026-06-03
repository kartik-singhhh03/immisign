# Document Library Audit

**Route:** `/workspace/[agency]/documents`  
**Evidence:** Production screenshots (2026-06-03), DB sample in `production-truth-audit.json`

---

## Actions

| Action | Status | Evidence |
|--------|--------|----------|
| Upload | **PARTIAL** | `useDocuments` → `DocumentsRepository.create` writes `documents` + storage |
| View list | **PASS** | 6 documents in DB for `abc-lab`; UI lists files |
| Preview / View | **PARTIAL** | Signed URL via storage; works when `file_url` resolves |
| Download | **PARTIAL** | Opens signed URL in new tab |
| Delete | **FAIL** | Button disabled by design (not DB-backed delete yet) |
| Send for signing | **PARTIAL** | Links to send flow; SignWell status often `null` in DB |

---

## Modal fields (before → after)

| Field (screenshot) | DB backed? | Action |
|--------------------|------------|--------|
| File name | Yes (`file_name`) | Keep |
| Document ID | Yes (`id`) | Keep |
| DHA Compliant & Hashed | **No** | **Removed** |
| Decryption key SHA-256#… | **No** | **Removed** |
| Category | Yes (derived: Agreement / Manual Upload) | Keep |
| File size | Yes (`file_size`) | Keep |
| MIME / format | Yes (`mime_type`) | Keep |
| SignWell status | Yes (`signwell_status`) | **Added** |
| SignWell document ID | Yes (`signwell_document_id`) | **Added** when set |
| Storage bucket | Yes (derived from `agreement_id`) | **Added** |
| Downloads / Decryptions | **No column** | **Removed** |
| Audited IP Access Log (static text) | **No** | **Removed** |

---

## Stats panel (before → after)

| Stat | Before | After |
|------|--------|-------|
| Total documents | List length only | `count` from repository |
| Vault space | Hardcoded 18.4 MB | Sum of `file_size` from loaded docs |
| Recent uploads | Hardcoded `3` | Count where `created_at` < 7 days |

---

## Send document failure (`spawn ETXTBSY`)

**Symptom:** `POST /api/documents/send` → 500, UI "Dispatch Failed spawn ETXTBSY"

**Cause:** Concurrent Puppeteer/Chromium PDF generation (attestation + agreement PDF) on serverless.

**Fix (repo):** `PDFService.generatePdf` serializes jobs with an internal queue.

**Production verification:** **PENDING DEPLOY** — re-test send flow after deploy.

---

## Result

| Item | Status |
|------|--------|
| No fake compliance/security fields | **PASS** (after deploy) |
| Fields match `documents` table | **PASS** (after deploy) |
| Delete action | **FAIL** (intentionally disabled) |
| Send for signing E2E | **PARTIAL** (fix pending deploy) |
