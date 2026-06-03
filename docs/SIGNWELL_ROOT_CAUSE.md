# SignWell Root Cause — `email already a recipient`

**Endpoint:** `POST /api/agreements/standard`  
**Production error (2026-06-03):**

```text
SignWell API Error (422): copied_contacts.copied_contact_1.email: is already a recipient
```

**API response today:** HTTP **502** with JSON body (not HTML) — still wrong status for validation errors.

---

## Root cause

1. User enables **CC me** (`ccMe: true`) on send step.
2. `buildSignwellDispatchExtras` adds agent email to `copied_contacts`.
3. When **client email equals agent email** (common when owner tests with own inbox), SignWell rejects because the same address is both a **recipient** and a **copied contact**.

Screenshot evidence: client `kartiksingh3337@gmail.com`, agent same person, CC checked → 422.

Secondary issue: secondary/sponsor/dependant signers fall back to `clientEmail` in `buildSignersFromWizard`, which can create duplicate recipient emails before CC is applied.

---

## Fixes (in repo — pending Vercel deploy)

| Fix | File |
|-----|------|
| Strip `copied_contacts` emails that match any recipient | `src/lib/signwell/dispatch-extras.ts`, `recipient-validation.ts` |
| Pass recipient emails into `buildSignwellDispatchExtras` | `signwell.service.ts`, `documents/send/route.ts` |
| Pre-flight validation: duplicate signers + CC same as client → **422** JSON | `api/agreements/standard/route.ts` |
| Friendly error message (no raw SignWell JSON) | `friendlySignwellError()` |
| Return **422** not **502** for validation-class SignWell errors | `api/agreements/standard/route.ts` |

---

## Expected behavior after deploy

| Scenario | HTTP | Body |
|----------|------|------|
| Client email = agent + CC me | **422** | `success: false`, clear message to use different CC or uncheck CC |
| Valid distinct emails | **200** | `success: true` |
| SignWell trial limit | **422** or **502** | Friendly trial message |

---

## Verification plan

1. Deploy fixes to Vercel.
2. Repeat send with **different** client email → expect SignWell success or trial limit message.
3. Repeat with same email + CC → expect **422** JSON, no 502.

**Production re-test:** **PENDING DEPLOY**

---

## Result

| Item | Status |
|------|--------|
| Root cause identified | **PASS** |
| Code fix | **PASS** (local) |
| Production verified | **FAIL** (pre-deploy) |
