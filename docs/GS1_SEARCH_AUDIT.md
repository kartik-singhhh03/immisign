# GS-1 Universal Search & Command Palette — Audit

**Status: PENDING BROWSER VERIFICATION**

Code implementation complete. PASS requires manual browser verification with screenshots.

## Architecture

| Layer | Path |
|-------|------|
| UI | `src/features/search/components/GlobalSearchModal.tsx` |
| Hooks | `src/features/search/hooks/useGlobalSearch.ts`, `useCommandPalette.ts` |
| Service | `src/features/search/services/global-search.service.ts` |
| Analytics | `src/features/search/services/search-analytics.service.ts` |
| API | `GET /api/search`, `/api/search/history`, `/api/search/saved`, `/api/search/analytics` |
| Migration | `supabase/migrations/20260616100000_global_search.sql` |

## Database Tables (new)

- `search_history` — last 10 recent queries per user
- `saved_searches` — named saved filter queries
- `search_analytics` — click tracking

**Apply migration before testing:**
```bash
npx supabase db push
# or run migration in Supabase SQL editor
```

## Search Scope

| Entity | Fields searched | Source |
|--------|----------------|--------|
| Clients | name, email, phone, client_number | `clients` |
| Matters | file number, visa, stage, agent, compliance | `ClientSearchService` |
| Agreements | number, title, client name/email | `agreements` |
| Approvals | number, title, subclass, stream | `application_approvals` |
| Documents | file_name | `documents` |
| File Notes | body, note_type | `file_notes` |
| SOS | statement_number, matter_reference | `service_statements` |
| Notifications | title, message | `notifications` |
| Activity | title, description, type | `activity_logs` |

## Natural Language Presets

- `show unsigned agreements` → unsigned agreements filter
- `show lodged matters` → lodged approvals
- `show awaiting approval` → pending approvals
- `today notes` → file notes created today
- `my matters` → assigned to current user
- `ready to lodge` → ready_to_lodge approvals

## Command Actions

| Query alias | Action |
|-------------|--------|
| new client | Create Client → `/onboarding/new` |
| new agreement | Create Agreement → `/agreements/new` |
| new approval | Create Approval → `/application-approvals/new` |
| new sos | Create SOS → `/service-statements/new` |
| upload document | Upload Document → `/documents/upload` |
| new note | File Notes → `/file-notes` |

## Verification Checklist

### DB
- [ ] Migration applied — `search_history`, `saved_searches`, `search_analytics` exist
- [ ] RLS policies allow authenticated user read/write own records

### API
- [ ] `GET /api/search?q=raj` returns grouped sections with real data
- [ ] `GET /api/search?meta=1` returns recent + saved + quickActions when idle
- [ ] `POST /api/search/saved` creates saved search
- [ ] `POST /api/search/analytics` records click

### Search Results
- [ ] Client search by name
- [ ] Matter search by file number (e.g. AGR-2026)
- [ ] Document search by filename
- [ ] File note search by body text
- [ ] Agreement / approval / SOS search
- [ ] Results grouped (not flat list)
- [ ] Matter rows show compliance score + stage

### Command Actions
- [ ] `new client` shows Create Client command
- [ ] `new agreement` shows Create Agreement
- [ ] `new note` shows Add File Note
- [ ] Quick Actions footer works on idle state

### Keyboard
- [ ] `Ctrl+K` / `⌘K` opens modal
- [ ] `↑` `↓` navigates results
- [ ] `Enter` opens selected result
- [ ] `Esc` closes modal

### Deep Links
- [ ] Matter result opens `/clients/{id}?file_source=…&file_id=…`
- [ ] Correct tab context (approval, file_notes, etc.)

### Mobile
- [ ] Fullscreen modal on iPhone viewport
- [ ] Mobile search icon opens palette
- [ ] Sticky search input, no horizontal scroll

### Performance
- [ ] Search completes under 500ms (check timing footer)
- [ ] Debounce 200ms — no request flood

### Screenshots (attach here)

| Test | Screenshot | Pass |
|------|------------|------|
| Command center idle | `docs/gs1-screenshots/idle.png` | ☐ |
| Client search results | `docs/gs1-screenshots/client-search.png` | ☐ |
| Matter grouped results | `docs/gs1-screenshots/matter-search.png` | ☐ |
| Command action | `docs/gs1-screenshots/command-action.png` | ☐ |
| Mobile fullscreen | `docs/gs1-screenshots/mobile.png` | ☐ |
| Keyboard navigation | `docs/gs1-screenshots/keyboard.png` | ☐ |

## Overall PASS Criteria

**DO NOT mark PASS until all checklist items verified in browser with screenshots.**
