# Phase 15 — Error Handling Audit

**Date:** 2026-06-03

---

## Error boundaries (React)

| Location | Retry | User message |
|----------|-------|--------------|
| `src/app/error.tsx` | Yes | "Something went wrong" + Try again |
| `src/app/workspace/[agency]/error.tsx` | Yes | Section error + Try again / Go home |
| `src/app/workspace/[agency]/dashboard/error.tsx` | Yes | Per-section |
| `src/app/workspace/[agency]/approvals/error.tsx` | Yes | Per-section |
| `src/app/workspace/[agency]/agreements/error.tsx` | Yes | Per-section |
| `src/app/workspace/[agency]/billing/error.tsx` | Yes | Per-section |
| `src/app/workspace/[agency]/documents/error.tsx` | Yes | Per-section |
| `src/app/workspace/[agency]/settings/error.tsx` | Yes | Per-section |

**PASS** — Workspace segments have error boundaries with retry actions.

---

## Failure scenarios

| Scenario | Expected UX | Status |
|----------|-------------|--------|
| Network failure on dashboard summary | Amber banner + empty widgets (`DashboardCommunications`) | **PASS** (Phase 14) |
| Supabase missing table (PGRST205) | API returns JSON; tasks return `[]` | **PASS** |
| SignWell send failure | API JSON 500 with message; UI alert | **PASS** (existing) |
| Stripe not configured | Billing API JSON 500; billing page degrades | **PASS** (env) |
| Missing workspace (logged in, no agency) | Redirect `/onboarding` | **PASS** |
| Workspace loading | "Loading workspace…" shell | **PASS** (Phase 15 fix) |
| Expired session | Middleware → login; API 401 JSON | **PASS** |
| Unauthorized route | Redirect `?access=denied` | **PASS** |

---

## API error shape (standardized Phase 15)

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "INTERNAL_ERROR"
}
```

Implemented via `src/lib/api/json-response.ts` on critical workspace routes.

---

## Client fetch patterns

| Component | Safe parse | Empty state |
|-----------|------------|-------------|
| `DashboardCommunications` | Yes | Yes |
| `ApprovalDashboardWidgets` | Yes | Yes (null until loaded) |
| Other data hooks (`useSupabaseData`) | Supabase client errors → loading/empty | Partial |

---

## Gaps

| Gap | Severity |
|-----|----------|
| Some legacy pages use `alert()` on errors | Low |
| Global session-expired toast not centralized | Low |
| `useRequireWorkspace` does not surface retry if onboarding wrong | Low |

---

## Result

**PASS** — Users see friendly messages and retry paths instead of white-screen crashes on audited paths.
