# Tenancy Map (Multi-Tenant Architecture)

All business entities in Immisign must be scoped by `agency_id` to ensure strict tenant isolation.

## Entities Requiring `agency_id`

- `users` (Users can belong to an agency, or be part of multiple via a pivot table)
- `agreements` (Agreements belong to the agency that drafted them)
- `approvals` (Approvals are routed within an agency)
- `documents` (Uploaded documents must be siloed by agency)
- `clients` (Clients are assigned to a specific agency)
- `templates` (Document templates belong to an agency)
- `billing_subscriptions` (Stripe billing is attached to the agency, not the user)

## Routes Requiring Agency Isolation
All routes under `/workspace/[agency]/...` require middleware or high-level layout checks to verify that the active user is a member of the requested `[agency]`.

## Services Requiring Tenant Context
- `DocumentService`
- `ApprovalService`
- `AgreementService`
All of these services must accept an `agency_id` parameter or extract it from a contextual request store to ensure no cross-tenant data leaks occur.
