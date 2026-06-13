# Migration Audit

**Date:** 2026-06-13  
**Database:** Supabase (ritiklabs production project)

## Tracking Note

`supabase_migrations.schema_migrations` reports **28** applied versions. Local `supabase/migrations/` contains **49** SQL files. Filename versions do not all appear in the tracking table — schema was evolved through earlier deployments and reconciliation.

## Required Schema — Verified Live

| Table.Column | Status |
|--------------|--------|
| `application_approvals.approval_token` | OK |
| `application_approvals.matter_id` | OK |
| `application_approval_events.event_type` | OK |
| `agreement_signatures.webhook_event_id` | OK |
| `webhook_events.payload_hash` | OK |
| Storage bucket `application-approvals` (private) | OK |

## Pending Local Migration File

`20260620130000_application_approval_rebuild.sql` — columns and tables **already present** in live DB (applied outside tracking or via prior run). **No action required** unless fresh environment.

## Recommendation

For new environments: run full migration chain via Supabase CLI. For current production: schema matches code expectations.
