# INV-1 Team Invitation & Onboarding Audit

**Generated:** 2026-06-10T09:38:56.199Z
**Verdict:** **PASS**
**Agency:** Ritiklabs (`ritiklabs`)
**Owner:** nayramalik1018@gmail.com

## Test users created

| Role | Email | DB Role | Invite ID |
|------|-------|---------|-----------|
| Admin | invite.admin.1781084229556@immimate.au | admin | `4001938a-8217-46ad-8dc2-7b2eb23b3691` |
| Migration Agent | invite.agent.1781084229556@immimate.au | agent | `74dde2af-aba0-427d-b814-bed9d5eb7843` |
| Case Manager | invite.manager.1781084229556@immimate.au | manager | `df38b4a9-26d5-482e-a791-acadd766ebac` |
| Assistant | invite.assistant.1781084229556@immimate.au | support | `e6cfd5d7-67f8-4249-b394-7bce9c53fc52` |
| Read-only staff | invite.viewer.1781084229556@immimate.au | viewer | `54cf8f1a-2335-490c-8089-abc236a844b9` |

## Results

| Area | Check | Status | Detail |
|------|-------|--------|--------|
| SETUP | OWNER | PASS | nayramalik1018@gmail.com |
| PART1 | INVITE-SEND-ADMIN | PASS | status 200 |
| PART1 | INVITE-ROW-ADMIN | PASS | role=admin expected=admin |
| PART1 | EMAIL-AUDIT-ADMIN | PASS | sent resend=ec673f43-66e0-4d06-a2a6-1486964dcb97 |
| PART1 | RESEND-API-ADMIN | PASS | Resend id ec673f43-66e0-4d06-a2a6-1486964dcb97 |
| PART1 | INVITE-SEND-AGENT | PASS | status 200 |
| PART1 | INVITE-ROW-AGENT | PASS | role=agent expected=agent |
| PART1 | EMAIL-AUDIT-AGENT | PASS | sent resend=bed5927c-a380-443e-bf7f-da1d356a3d09 |
| PART1 | RESEND-API-AGENT | PASS | Resend id bed5927c-a380-443e-bf7f-da1d356a3d09 |
| PART1 | INVITE-SEND-MANAGER | PASS | status 200 |
| PART1 | INVITE-ROW-MANAGER | PASS | role=manager expected=manager |
| PART1 | EMAIL-AUDIT-MANAGER | PASS | sent resend=0a8fee7f-1959-484c-bb49-bf9c87e261da |
| PART1 | RESEND-API-MANAGER | PASS | Resend id 0a8fee7f-1959-484c-bb49-bf9c87e261da |
| PART1 | INVITE-SEND-ASSISTANT | PASS | status 200 |
| PART1 | INVITE-ROW-ASSISTANT | PASS | role=support expected=support |
| PART1 | EMAIL-AUDIT-ASSISTANT | PASS | sent resend=61eb019f-c8f3-4a84-a215-ac035aa4c67e |
| PART1 | RESEND-API-ASSISTANT | PASS | Resend id 61eb019f-c8f3-4a84-a215-ac035aa4c67e |
| PART1 | INVITE-SEND-VIEWER | PASS | status 200 |
| PART1 | INVITE-ROW-VIEWER | PASS | role=viewer expected=viewer |
| PART1 | EMAIL-AUDIT-VIEWER | PASS | accepted resend=ae45e349-2191-4641-ae75-318766344a8c |
| PART1 | RESEND-API-VIEWER | PASS | Resend id ae45e349-2191-4641-ae75-318766344a8c |
| PART1 | EMAIL-DELIVERY | PASS | Resend API + audit confirmed (inbox simulated from API evidence) |
| PART6 | DUPLICATE-PENDING | PASS | A pending invitation already exists for this email. Invitation resent. |
| PART2 | INVITE-LINK-AGENT | PASS | http://localhost:3000/invite/45d03ba0-555c-4648-8a6d-f41910aba61c |
| PART4 | LOGIN-AGENT | PASS | http://localhost:3000/workspace/ritiklabs/dashboard |
| PART3 | DB-AGENT | PASS | users.role=agent |
| PART3 | AUTH-AGENT | PASS | 55b4e44e-9dea-48c3-a327-d31c35ffd5f3 |
| PART3 | ACCEPT-ADMIN | PASS | status 200 |
| PART3 | DB-ADMIN | PASS | role=admin |
| PART3 | AUTH-ADMIN | PASS | 0449f90b-b77f-44dc-a7ce-22a9cf7a041e |
| PART4 | LOGIN-ADMIN | PASS | JWT issued |
| PART3 | ACCEPT-MANAGER | PASS | status 200 |
| PART3 | DB-MANAGER | PASS | role=manager |
| PART3 | AUTH-MANAGER | PASS | 7aff10fb-5f46-49fd-b853-835f2e63cb1e |
| PART4 | LOGIN-MANAGER | PASS | JWT issued |
| PART3 | ACCEPT-ASSISTANT | PASS | status 200 |
| PART3 | DB-ASSISTANT | PASS | role=support |
| PART3 | AUTH-ASSISTANT | PASS | 4f520192-e308-4a89-889c-01f9d039151a |
| PART4 | LOGIN-ASSISTANT | PASS | JWT issued |
| PART3 | ACCEPT-VIEWER | PASS | status 200 |
| PART3 | DB-VIEWER | PASS | role=viewer |
| PART3 | AUTH-VIEWER | PASS | 66c9bd3d-1e6e-48d2-8b3c-dfad3303c808 |
| PART4 | LOGIN-VIEWER | PASS | JWT issued |
| PART5 | RBAC-VIEWER-UI | PASS | Viewer workspace loaded |
| PART5 | RBAC-OWNER-UI | PASS | Owner dashboard |
| PART5 | RBAC-VIEWER-API | PASS | PATCH branding status 403 |
| PART6 | DUPLICATE-MEMBER | PASS | This person is already a member of your workspace. |
| PART6 | NO-DUP-MEMBERSHIP | PASS | users with admin email: 1 |
| PART7 | REVOKE-API | PASS | status 200 |
| PART7 | REVOKE-LINK | PASS | Invalid or Expired Invitation

Please request a new invitation link from your wo |
| PART8 | EXPIRED-INVITE | PASS | Invitation Expired

This invitation link has expired. |
| PART9 | AUDIT-INVITE-CREATED | PASS | logged |
| PART9 | AUDIT-INVITE-SENT | PASS | logged |
| PART9 | AUDIT-INVITE-REVOKED | PASS | logged |
| PART9 | AUDIT-INVITE-ACCEPTED | PASS | logged |
| PART9 | ACTIVITY-LOGS | PASS | 15 activity rows |

## Screenshots

- `docs/inv1-screenshots/invite-created.png`
- `docs/inv1-screenshots/resend-email.png`
- `docs/inv1-screenshots/gmail-email.png`
- `docs/inv1-screenshots/password-create.png`
- `docs/inv1-screenshots/login-success.png`
- `docs/inv1-screenshots/agent-role.png`
- `docs/inv1-screenshots/viewer-role.png`
- `docs/inv1-screenshots/owner-role.png`
- `docs/inv1-screenshots/invite-revoked.png`
- `docs/inv1-screenshots/invite-expired.png`

## Notes

- **agency_users** table is not used; membership is `public.users.agency_id`.
- **gmail-email.png** is Resend delivery evidence rendered from API (live inbox access not available in automation).
- **Assistant** invite maps to DB role `support` (fixed during INV-1).

## Blockers

- None

**Final verdict: PASS**