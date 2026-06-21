# Native Signing Storage Report

**Status:** NOT RUN — blocked by migration gate (Step 1 FAIL)

Storage verification requires a completed native signing E2E run.

Run after migration applied:

```bash
node scripts/native-agreement-signing-e2e.mjs
```

This report will be populated by the E2E script at `docs/NATIVE_SIGNING_STORAGE_REPORT.md`.

---

## Required artifacts (when run)

| File | Bucket | Path pattern |
|------|--------|--------------|
| signed-agreement.pdf | secure_documents | `{agencyId}/agreements/{id}/signed-agreement.pdf` |
| agreement-signing-record.pdf | documents | `{agencyId}/agreements/{id}/agreement-signing-record.pdf` |
| client-signature.png | secure_documents | `{agencyId}/agreements/{id}/client-signature.png` |

**Verdict:** NOT PASS
