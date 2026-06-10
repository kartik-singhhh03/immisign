# Event Logging Coverage Report

**Status: PASS**

## `compliance_events` Table

Migration: `20260615100000_prod_precheck_hardening.sql`

## Events Wired

| Event | Service |
|-------|---------|
| sos_created / sent / acknowledged | `service-statement.service.ts` |
| note_added / notes_exported | `file-notes.service.ts` |
| agreement_created / sent / signed | `agreements/standard/route.ts`, `signwell/route.ts` |
| approval_created / sent / signed | `approval.service.ts`, `signwell/route.ts` |
| lodgement_recorded | `approval.service.ts` |
| matter_completed | `file-notes.service.ts` |

## Live Verification

- `note_added` recorded via API + DB count increase
