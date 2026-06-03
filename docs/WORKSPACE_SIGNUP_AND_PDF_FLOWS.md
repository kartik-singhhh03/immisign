# Workspace signup & PDF flows

## Professional signup (SaaS)

- **Workspace URL** field with live preview: `{host}/workspace/{slug}`
- **Availability check**: `GET /api/auth/workspace-slug?slug=...`
- **Suggestions** when taken (e.g. `kartik-labs-24`, `kartik-labs-2`)
- **Submit** disabled until URL is valid and available
- **Server**: validates slug, handles email duplicates with clear copy, race-safe slug with `slug_adjusted` in response

### Why "KARTIK LABS" failed before

Agency name → slug `kartik-labs`. That slug was already in `agencies`. The form did not show or edit the URL.

### New user flow

1. Enter agency name → URL auto-fills (editable).
2. Wait for green check (available).
3. If taken → click a suggestion or edit URL.
4. Create workspace.

---

## PDF flows (real generation)

Both use **`PDFService.generatePdf()`** (Puppeteer + Chrome locally, `@sparticuz/chromium` on Vercel).

| Flow | Entry | PDF output |
|------|--------|------------|
| **Agreement wizard send** | `POST /api/agreements/standard` | `DocumentGenerationService.generateDocument()` → HTML agreement → PDF → `secure_documents` |
| **Send document dispatch** | `POST /api/documents/send` | `generateSenderAttestationPdf()` → agent certification PDF + uploaded doc → SignWell |

### Local verification

```bash
node scripts/pdf-flow-smoke.mjs http://localhost:3001
```

Expect: `PASS`, `header: '%PDF-1.4'`, bytes > 500.

### Production (Vercel)

- `vercel.json` includes `@sparticuz/chromium` for agreement, documents/send, and preview routes.
- `pdf.service.ts` uses default Chromium path on Vercel (no custom `build/` path).

After deploy, re-test agreement send and document send on `avc-migration-live`.
