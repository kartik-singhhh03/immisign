# Agreement Wizard Audit

**Route:** `/workspace/[agency]/agreements/new`  
**Evidence:** DB + production screenshots + `production-truth-audit.json`

---

## Step verification

### Client step

| Check | Status | Evidence |
|-------|--------|----------|
| Clients from DB | **PASS** | `ClientStep` uses Supabase clients hook |
| No hardcoded client list | **PASS** | Code review + 2 clients in DB for `abc-lab` |

### Matter step

| Check | Status | Evidence |
|-------|--------|----------|
| Matter types from `matter_types` | **PASS** (DB) | **2 rows** for `abc-lab`: `visa`, `student visa` |
| Empty dropdown on Vercel screenshot | **PARTIAL** | DB has types; UI may be stale build or session — add empty-state link to Settings (fix in repo) |
| Subclass / applicant persistence | **PASS** | Wizard draft API `PUT /api/agreements/wizard-draft` |
| Reload persistence | **PARTIAL** | `GET /api/agreements/wizard-draft` returns **401** with Bearer-only probe; **PASS** in browser (cookies) |

### Fees / Terms / Preview / Send

| Check | Status | Evidence |
|-------|--------|----------|
| Draft save | **PARTIAL** | Implemented; cookie auth in browser |
| Preview | **PARTIAL** | Uses real agency settings + form |
| Send | **FAIL** on prod (pre-fix) | SignWell 422 duplicate email → 502 |

---

## Database

```json
"matter_types": [
  { "name": "visa" },
  { "name": "student visa" }
]
```

If dropdown appears empty after deploy, verify Settings → Matter Types UI saves to same `agency_id`.

---

## Fixes in repo

1. `MatterStep` — empty-state with link to Settings when `matterTypes.length === 0`
2. `MatterStep` — `canContinue` requires `matterTypeId` or name
3. Removed fake success hash on legacy `NewAgreementPage`

---

## Result

| Step | Status |
|------|--------|
| Client | **PASS** |
| Matter types (DB) | **PASS** |
| Matter UI (prod) | **PARTIAL** until deploy + retest |
| Draft persistence | **PARTIAL** |
| Send / SignWell | **FAIL** on prod today → see `SIGNWELL_ROOT_CAUSE.md` |
