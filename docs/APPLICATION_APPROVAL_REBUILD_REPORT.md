# Application Approval Rebuild — Implementation Report

**Task:** APPLICATION-APPROVAL-REBUILD-1  
**Date:** 2026-06-06  
**Build:** `npm run build` — **PASS**

## Status: IMPLEMENTED — E2E VERIFICATION PENDING

Code implementation is complete for the simplified client sign-off workflow. **Browser, email (Resend), storage, and database verification have not been run in this session** and are required before marking the module complete per the definition of done.

---

## What Was Built

### Agent workflow (`/workspace/{agency}/approvals/new`)
Four-step wizard matching prototype (ImmiMate brand colors):

1. **Client + Matter** — search by name/email/phone/matter ref; matter pills; auto-readonly fields
2. **Upload** — single PDF/DOCX to `application-approvals` bucket; draft persisted
3. **Message** — subject + body with defaults; autosave on blur
4. **Preview & Send** — preview card; Resend email with `/approval/{token}` link; success screen

### Client portal (`/approval/[token]`)
Public route (no login):

- Agency/agent header, message, attachment download (signed URL)
- Three declaration checkboxes + full legal name
- **Approve Application for Lodgement** / **I have concerns** modal
- Success audit summary (client, matter, time, IP, confirmed name)
- Expired/invalid link screen

### APIs
| Route | Purpose |
|-------|---------|
| `GET/POST /api/application-approvals` | List / create draft |
| `GET/PATCH /api/application-approvals/[id]` | Get / update message / clear file |
| `POST .../upload` | PDF/DOCX upload |
| `POST .../send` | Token + email |
| `GET/POST /api/public/approval/[token]` | Client view / approve / decline |
| `GET /api/public/approval/[token]/download` | Signed download + timeline event |
| `GET /api/approvals/widgets` | Real DB counts (sent/viewed/approved/changes_requested) |

### Database & storage
Migration: `supabase/migrations/20260620130000_application_approval_rebuild.sql`  
- Table columns + `application_approval_events` timeline  
- Bucket `application-approvals` with RLS  
**Must be applied to Supabase** before upload/send works in production.

### UI updates
- List page uses new API and statuses
- Detail page simplified (no internal workflow/checklist)
- Dashboard widgets wired (compliance dashboard + approvals list)
- Sidebar: **Application Approvals**, **Document Sign**, **File Notes**, **SOS**; **Templates removed from nav** (API kept for agreements)

### Security
- Rate limiting on public approval routes (`src/lib/rate-limit.ts`)
- Signed URLs only (no public storage)
- Single-use token logic on approve/decline
- Agency isolation via existing RLS + workspace API context

---

## Not Done / Deferred

| Item | Notes |
|------|-------|
| Browser E2E | Required — create approval, send, open link, approve, request changes |
| Resend inbox verification | Required |
| Migration apply | Run against local/production Supabase |
| Legacy API removal | Old `/api/approvals/*/transition`, checklist, comments still exist (unused by new UI) |
| Agreement draft-jump bug | Documented only — do not fix until approval module E2E passes |

---

## Manual Test Checklist

### Agent
- [ ] Search client → select matter → auto fields populate
- [ ] Upload PDF → file name/size shown → remove/replace works
- [ ] Message autosaves
- [ ] Preview → Send → success screen
- [ ] Email arrives in inbox (Resend)
- [ ] Approval appears in list with status `sent`

### Client
- [ ] Open `/approval/{token}` without login
- [ ] Download PDF (signed URL)
- [ ] Approve with all checkboxes + name
- [ ] Request changes with reason
- [ ] Expired token shows Link Expired
- [ ] Reuse token after approve blocked

### Database
- [ ] `application_approvals` status/timestamps correct
- [ ] `application_approval_events` timeline rows
- [ ] `email_delivery_audit` row on send
- [ ] Notifications created for agent

### Smoke script
```bash
node scripts/application-approval-rebuild-verify.mjs http://localhost:3000
```

---

## Agreement Bug (unchanged)

**Current:** New Agreement detects draft and jumps to Send step.  
**Expected:** Always start at Step 1 Client.  
Fix only after Application Approval is fully browser-verified.
