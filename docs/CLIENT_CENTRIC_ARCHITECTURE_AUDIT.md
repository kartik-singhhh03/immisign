# Client-Centric Architecture Audit (Phase 16A)

**Date:** 2026-06-03  
**Product:** ImmiMate (migration compliance platform)  
**Principle:** Client entered once. Matter entered once. All modules derive from those records.

---

## Executive summary

The data model already centers on `clients`, `matter_types`, and foreign keys (`client_id`, `matter_type_id`) on agreements and application approvals. **UI duplication remains the primary gap**: several flows still ask agents to re-type name, email, phone, and applicant details instead of selecting a library client and showing read-only derived fields.

**Overall:** **PARTIAL** — schema is client-centric; UX is not fully enforced.

---

## Module review

| Module | DB linkage | UI duplication | Status |
|--------|------------|----------------|--------|
| Clients | Source of truth (`clients`) | Single entry on Clients page | **PASS** (if CRUD verified E2E) |
| Agreements | `agreements.client_id`, wizard metadata | Was manual Client step; **client picker added** in Phase 16 | **PARTIAL** until browser E2E |
| Application Approvals | `application_approvals.client_id` | Wizard uses `Select` from DB | **PASS** pattern; needs E2E |
| Documents | `client_id` on send flows | Send document may still free-text recipient | **PARTIAL** |
| Tasks | Agency-scoped | No client FK on all task types | **PARTIAL** |
| Notifications | Entity refs | Derived from entities | **PASS** pattern |
| Reports | Aggregates | No duplicate client forms found | **PARTIAL** (module immature) |

---

## Duplication points (current)

### High severity — manual re-entry

| Location | Fields re-entered | Recommended fix |
|----------|-------------------|-----------------|
| `src/features/agreements/components/NewAgreementPage.tsx` | clientName, clientEmail, phone, applicants | Deprecate or wire to `client_id` + readonly |
| `src/components/saas/application-approvals/pages.tsx` | clientName, clientEmail (legacy SaaS page) | Replace with client picker + `client_id` |
| Agreement wizard `MatterStep.tsx` | primaryApplicantName, DOB, dependants, sponsor | Prefill from `clients` + matter defaults; readonly when `client_id` set |
| `SendDocumentPage.tsx` | Recipient email/name | Lookup from `clients` |

### Medium severity — derived but editable

| Location | Issue |
|----------|--------|
| Agreement API `standard/route.ts` | Upserts client by email if no `client_id` — OK for net-new, but can fork duplicates if email typos |
| SignWell dispatch | Uses agreement + client record when `client_id` present |

### Low severity — display only

| Location | Notes |
|----------|-------|
| `SendStep.tsx` | Shows wizard snapshot (OK if sourced from client record at send time) |
| Dashboard / search | Read-only client names from joins |

---

## Fields audit

| Field | Canonical store | Duplicate entry locations |
|-------|-----------------|-------------------------|
| Client name | `clients.name` | Agreement wizard (legacy), NewAgreementPage, legacy approvals UI |
| Email | `clients.email` | Same |
| Phone | `clients.phone` | Agreement wizard, client form |
| DOB | `clients.dob` (migration) | Matter step applicant DOB fields |
| Subclass | `matter_types` / approval `visa_subclass` | Matter step + approval wizard (matter-linked) |
| Agent | `users` / `rmas` | Agreement `responsibleRma` (should stay RMA picker, not re-type agent identity) |

---

## Recommended schema changes

1. **`agreements`**: Enforce `client_id NOT NULL` for new rows (nullable only during legacy backfill).
2. **`clients`**: Add `date_of_birth`, `address`, `visa_subclass` optional columns for single-source applicant demographics.
3. **`application_approvals`**: Already has `client_id`; add DB constraint preventing conflicting `client_email` text columns if any remain in metadata.
4. **`service_statements`** (Phase 16E foundation): `client_id`, `matter_type_id`, `agreement_id`, `approval_id` — no denormalized client name column except snapshot JSON at issue time.

---

## Migration plan

| Phase | Action |
|-------|--------|
| M1 | Apply `20260606100000_phase16_security_foundation.sql` (includes `service_statements` tables) |
| M2 | Backfill `agreements.client_id` from `metadata.wizard_form.clientEmail` where missing |
| M3 | Agreement wizard: **done** — client library select + readonly contact fields |
| M4 | Remove or redirect `NewAgreementPage` legacy flow to wizard |
| M5 | Matter step: prefill applicant name/DOB from `clients` when `client_id` set |
| M6 | Legacy `application-approvals/pages.tsx` → workspace approval wizard only |

---

## Statement of Service integration (future)

Statement records must be created only with FKs:

```
service_statements.client_id
service_statements.matter_type_id
service_statements.agreement_id (optional)
service_statements.approval_id (optional)
```

Line items (`service_statement_items`) inherit agency from statement; fees pull from agreement payment schedule / approval fee metadata — never re-enter client identity.

See `docs/STATEMENT_OF_SERVICE_ARCHITECTURE.md`.

---

## Verification required (no code-only PASS)

- [ ] Create client once on Clients page → DB row verified
- [ ] New agreement: select client → name/email readonly → agreement row `client_id` set
- [ ] New approval: select same client → no duplicate typing
- [ ] RLS: agent cannot read another agency's clients

---

## Phase 16A result: **PARTIAL**

Foundation and agreement client picker implemented in repo; full client-centric compliance requires Matter step prefill, legacy page removal, and E2E evidence.
