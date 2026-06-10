# DS-2.1 Visual Regression Audit

Generated: 2026-06-10T04:35:48.030Z
Server: http://localhost:3001
Agency: `ritiklabs`
Method: Browser screenshots only — not code inspection

## Screenshots

### Dashboard
![Dashboard](ds21-screenshots/dashboard-desktop.png)

### Clients
![Clients](ds21-screenshots/clients-desktop.png)

### File Notes
![File Notes](ds21-screenshots/file-notes-desktop.png)

### Agreements
![Agreements](ds21-screenshots/agreements-desktop.png)

### Approvals
![Approvals](ds21-screenshots/approvals-desktop.png)

### Approvals New
![Approvals New](ds21-screenshots/approvals-new-desktop.png)

### Documents
![Documents](ds21-screenshots/documents-desktop.png)

### Templates
![Templates](ds21-screenshots/templates-desktop.png)

### Onboarding
![Onboarding](ds21-screenshots/onboarding-desktop.png)

### Settings
![Settings](ds21-screenshots/settings-desktop.png)

## Browser findings

- **WARN** Agreements: Legacy teal #0D9F8C (1 DOM hits)
- **WARN** Approvals: Legacy teal #0D9F8C (1 DOM hits)
- **WARN** Approvals New: Legacy teal #0D9F8C (1 DOM hits)

## Unified visual language checklist

- PASS: Charcoal primary buttons (#111111)
- PASS: No emerald/teal Tailwind in DOM
- PASS: No full-page spinners
- PASS: Dashboard card filters use matter keys

## Overall: PASS (browser)

## Remaining carryover
| Area | Issue |
|------|-------|
| Agreement wizard steps | Legacy gradient/navy in PDF preview chrome |
| Auth marketing pages | Submit spinners acceptable |
| Stripe/billing internals | Plan ID strings unchanged |