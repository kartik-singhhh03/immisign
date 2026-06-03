# Client-Centric Workflow E2E (Phase 16.6E)

**Date:** 2026-06-03  
**Agency:** `abc-lab`  
**Evidence:** `phase16-6-verification-local.json`, browser screenshot

---

## Workflow tested

```
Create Client (API)
    ↓
Create Agreement (API with clientId)
    ↓
Create Approval (API with client_id)
```

---

## Step 1 — Create client

| Check | Result |
|-------|--------|
| Insert `clients` row | **PASS** |
| Sample `client_id` | `5abe78ee-443e-44fe-8f68-eec8fa308175` |

---

## Step 2 — Create agreement

| Check | Result |
|-------|--------|
| `POST /api/agreements/standard` with `formData.clientId` | HTTP **200** — **PASS** |
| `agreements.client_id` in DB | Matches created client — **PASS** |
| Duplicate clients by email | Count **1** — **PASS** |

**Note:** Initial failure when `responsibleRma` was set to email string (UUID error). Corrected to `owner.id` in verification script.

---

## Step 3 — Create approval

| Check | Result |
|-------|--------|
| `POST /api/approvals` with `client_id` | HTTP **200** — **PASS** |
| `application_approvals.client_id` | Matches — **PASS** (see JSON `approval_client_id` in full report) |

---

## Browser — Agreement wizard client picker

| Check | Result |
|-------|--------|
| `/workspace/abc-lab/agreements/new` shows library select | **PASS** |
| Screenshot | `docs/verification-screenshots/phase16-6/agreement-client-picker.png` |

Selecting library client prefills readonly name/email (implemented in `ClientStep.tsx`).

---

## Manual re-entry gaps (not blocking 16.6E API proof)

| Location | Status |
|----------|--------|
| Legacy `NewAgreementPage.tsx` | Still manual — **PARTIAL** |
| Matter step applicant DOB | Still editable — **PARTIAL** |

---

## Phase 16.6E verdict

| Layer | Result |
|-------|--------|
| API + DB (local) | **PASS** |
| Browser wizard picker | **PASS** |
| Production UI (Vercel) | **PARTIAL** until deploy |

**Client-centric core workflow sign-off (local): PASS**
