# UI Consistency Audit (Phase 16.8A)

**Date:** 2026-06-03  
**Scope:** Workspace app (post-Phase 16 security work)  
**Goal:** Identify inconsistency without redesigning workflows.

---

## Summary

The product uses a coherent **teal / slate** palette (`#0D9F8C`, `#081B2E`) but implements it through **parallel patterns** (inline Tailwind vs shadcn vs custom `PageHeader` duplicates). Phase 16.8 introduces `src/components/ui/standards/` as the consolidation target.

---

## Spacing & layout

| Issue | Locations | Severity |
|-------|-----------|----------|
| Duplicate `PageHeader` implementations | `ClientsPage`, `SettingsPage`, `PageHeader` layout component | Medium |
| Card padding varies (`p-5`, `p-6`, `p-7`, `p-8`) | Settings, agreements, documents | Low |
| Wizard max-width differs (`max-w-4xl` vs full width send doc) | Agreement vs Send Document | Low |

---

## Buttons

| Pattern | Usage |
|---------|--------|
| Primary teal `bg-[#0D9F8C]` | Dominant — good |
| Dark navy `bg-[#081B2E]` | Send document dispatch — intentional CTA variant |
| shadcn `Button` variants | Mixed with hardcoded classes on same component |

**Recommendation:** Use `ui.btnPrimary` / `ui.btnSecondary` from standards for new edits.

---

## Inputs & forms

| Issue | Notes |
|-------|-------|
| Consistent `h-11 rounded-xl` on wizards | **PASS** on agreement wizard |
| `minLength={6}` removed on invite (Phase 16) | **PASS** |
| Some forms use `alert()` for errors | `ClientsPage` fixed → toast in 16.8 |
| Double-submit guards | Partial — `disabled={isSubmitting}` on clients; not universal |

---

## Cards & tables

| Issue | Notes |
|-------|-------|
| Table wrappers differ | Some `overflow-x-auto` without sticky header |
| Agreements list has client-side pagination | **PASS** pattern |
| Approvals list server-driven page param | **PASS** |
| Security audit table | New — needs same wrapper class |

---

## Typography

| Element | Standard observed |
|---------|-------------------|
| Eyebrow | `text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]` |
| Page title | `text-3xl font-bold text-[#081B2E]` |
| Field label | `text-[11px] font-bold uppercase text-slate-500` |

**Issue:** Marketing pages use `font-serif-hero`; workspace uses sans — acceptable split.

---

## Badges & status

| Component | Status |
|-----------|--------|
| `StatusPill` (dashboard-pages) | Used on clients/agreements |
| `ApprovalStatusBadge` | Approvals only |
| Inline colored spans | Scattered in legacy SaaS pages |

---

## Empty states

| Module | Before 16.8 | After 16.8 |
|--------|-------------|------------|
| Clients | "No clients found" text | `PageEmptyState` + CTA |
| Agreements | Inline empty search | Full empty + `PageEmptyState` |
| Approvals | Icon + one line | `PageEmptyState` + filter-aware message |
| Documents | Search-only message | Unchanged (partial) |
| Tasks / Notifications | Generic or missing | **PARTIAL** — presets exist, not wired everywhere |

---

## Loading states

| Area | Before | After 16.8 |
|------|--------|------------|
| Agreement send | Pulse bar | `WorkflowProgress` step list |
| Send document | % bar + logs | `WorkflowProgress` + toasts |
| Agreement draft | Silent debounce | `AutosaveIndicator` |
| List pages | Text "Loading…" | Skeleton on clients; others partial |

---

## Fake / non-DB UI (must not add)

| Item | Status |
|------|--------|
| Dashboard KPI deltas (+12%) | Removed Phase 14 — **PASS** |
| Document library SHA-256 / 18.4 MB fake stats | Removed stabilization — **PASS** |
| Send document mock email templates | Static copy options — **OK** (user selects, not fake metrics) |
| Analytics page | Review before enabling — **PARTIAL** |

---

## Scrollbars

| Area | Before | After 16.8 |
|------|--------|------------|
| Browser default on tables | Yes | `.immimate-scroll` on agreements, approvals, sidebar, dialogs |
| Modals | Default | `DialogContent` max-height + scroll class |

---

## Phase 16.8A verdict

**PARTIAL** — Audit complete; consolidation started via `standards/` package. Full app-wide migration is incremental (not big-bang redesign).
