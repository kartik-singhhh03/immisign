# Beta Tester Risk Report

**Overall Risk: LOW** (PROD-PRECHECK green)

## Mitigated Risks

- Thin client intake → unified onboarding wizard (ONB)
- Missing audit trail → `compliance_events` + `document_audit_events`
- Manual signature dates → webhook-only, PATCH blocked
- Hardcoded fees/visa values → settings + user input only
- Mobile layout breaks → verified on 4 viewports

## Residual Watch Items

- Historical `compliance_events` rows populate as agents use workflows (wiring verified, not all event types have live history yet)
- Full SignWell E2E with real provider in production environment recommended before public launch
- Agencies with zero matter types: onboarding blocks at matter type step (no dead end — options API returns empty list)

## Recommended Beta Onboarding

1. Configure Matter Types + Financial Settings (surcharge %)
2. Create client via **New Client & Matter** wizard
3. Run one full workflow: Agreement → Approval → Lodge → SoS
