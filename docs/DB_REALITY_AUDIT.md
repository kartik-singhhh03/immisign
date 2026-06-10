# DB Reality Audit

Generated: 2026-06-10T07:49:33.800Z

## Known gaps (audited)

- notification_priority_enum: present
- notification_scope_enum: present
- email_digest_enum: present
- notifications_priority: present
- notifications_scope: present
- notifications_deleted_at: present
- notifications_metadata: present
- activity_events: present
- webhook_events: present
- email_delivery_audit: present
- integration_health_logs: present

## Critical tables

| Table | Exists |
|-------|--------|
| clients | YES |
| agreements | YES |
| agreement_fee_items | YES |
| application_approvals | YES |
| service_statements | YES |
| file_notes | YES |
| notifications | YES |
| activity_events | YES |
| webhook_events | YES |
| document_audit_events | YES |
| email_delivery_audit | YES |
| matter_applicants | YES |
| matter_financials | YES |
| integration_health_logs | YES |

## notifications columns

- priority: YES
- scope: YES
- deleted_at: YES
- metadata: YES
- assigned_to_user_id: YES
- due_at: YES
- archived_at: YES

## RLS critical tables

| Table | RLS | Policies |
|-------|-----|----------|
| clients | enabled | 4 |
| agreements | enabled | 4 |
| application_approvals | enabled | 4 |
| notifications | enabled | 2 |
| file_notes | enabled | 2 |
| service_statements | enabled | 1 |
| document_audit_events | enabled | 2 |
| activity_events | enabled | 2 |
| email_delivery_audit | enabled | 1 |
| webhook_events | enabled | 1 |
| integration_health_logs | enabled | 1 |

## Migration history vs disk

Recorded in schema_migrations: 33
Files on disk: 47

| File | History | Schema objects |
|------|---------|----------------|
| 00000000000000_base_schema.sql | APPLIED | APPLIED |
| 20260528000000_email_schema_update.sql | APPLIED | APPLIED |
| 20260528000001_signwell_schema_update.sql | APPLIED | N/A (alters only) |
| 20260528000002_stripe_schema_update.sql | APPLIED | APPLIED |
| 20260529000000_tenant_rls_policies.sql | APPLIED | APPLIED |
| 20260529000001_agreement_domain.sql | APPLIED | APPLIED |
| 20260529000002_application_approvals.sql | APPLIED | APPLIED |
| 20260529000003_signwell_tables.sql | APPLIED | APPLIED |
| 20260529999999_storage_setup.sql | APPLIED | N/A (alters only) |
| 20260530000000_agreement_template_engine.sql | APPLIED | N/A (alters only) |
| 20260601000000_standalone_documents.sql | APPLIED | N/A (alters only) |
| 20260601110000_role_template_permissions.sql | APPLIED | N/A (alters only) |
| 20260601184107_matter_defaults_table.sql | APPLIED | APPLIED |
| 20260602181500_user_signatures.sql | APPLIED | APPLIED |
| 20260603100000_immisign_single_plan_billing.sql | APPLIED | N/A (alters only) |
| 20260603120000_agreement_wizard_drafts.sql | APPLIED | APPLIED |
| 20260603140000_phase7_audit.sql | APPLIED | APPLIED |
| 20260603150000_auto_agent_signatures.sql | APPLIED | N/A (alters only) |
| 20260603160000_settings_full_audit.sql | APPLIED | APPLIED |
| 20260603170000_phase11_1_hardening.sql | APPLIED | APPLIED |
| 20260603170000_phase85_settings_parity.sql | APPLIED | APPLIED |
| 20260603180000_phase11_2_schema_repair.sql | APPLIED | APPLIED |
| 20260604100000_phase12_application_approvals.sql | APPLIED | APPLIED |
| 20260604150000_agency_workspace_provision.sql | APPLIED | N/A (alters only) |
| 20260604160000_input_validation_constraints.sql | APPLIED | N/A (alters only) |
| 20260605100000_phase13_notifications_comms.sql | APPLIED | APPLIED |
| 20260606100000_phase16_security_foundation.sql | APPLIED | APPLIED |
| 20260607120000_phase17_signwell_signup_sync.sql | APPLIED | APPLIED |
| 20260608100000_phase16_9_workflow_integrity.sql | APPLIED | N/A (alters only) |
| 20260609100000_file_notes.sql | NOT IN HISTORY | APPLIED |
| 20260609110000_approval_client_signing.sql | NOT IN HISTORY | N/A (alters only) |
| 20260609120000_service_statements_ack.sql | NOT IN HISTORY | N/A (alters only) |
| 20260610120000_approval_signed_document.sql | NOT IN HISTORY | N/A (alters only) |
| 20260610130000_file_notes_compliance.sql | NOT IN HISTORY | N/A (alters only) |
| 20260611130000_sos_module_complete.sql | NOT IN HISTORY | MISSING (service_catalog, visa_service_templates) |
| 20260611150000_file_notes_file_scoped.sql | NOT IN HISTORY | APPLIED |
| 20260611160000_agreement_wizard_ux.sql | NOT IN HISTORY | APPLIED |
| 20260611170000_client_matter_details.sql | NOT IN HISTORY | N/A (alters only) |
| 20260612100000_mm4_matter_completion.sql | NOT IN HISTORY | N/A (alters only) |
| 20260613100000_rls_security_advisor_fix.sql | APPLIED | N/A (alters only) |
| 20260614100000_onb_unified_onboarding.sql | APPLIED | APPLIED |
| 20260615100000_prod_precheck_hardening.sql | APPLIED | APPLIED |
| 20260616100000_global_search.sql | NOT IN HISTORY | MISSING (search_history, saved_searches, search_analytics) |
| 20260617100000_ntf1_notifications.sql | NOT IN HISTORY | APPLIED |
| 20260618100000_int1_webhook_events.sql | NOT IN HISTORY | APPLIED |
| 20260619100000_rsd1_email_delivery_audit.sql | NOT IN HISTORY | APPLIED |
| 99999999999999_reconciliation.sql | APPLIED | APPLIED |