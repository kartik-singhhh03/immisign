# MOCK-1 Production Data Audit

**Generated:** 2026-06-10T12:05:33.769Z
**Verdict:** **PASS**
**Agency:** Ritiklabs SETTINGS1 1781085718037 (`ritiklabs`)

## Results

| Area | Check | Status | Detail |
|------|-------|--------|--------|
| C1 | CODE-11111111-111 | WARN | matches=16 prod_src=1 |
| C1 | CODE-00000000-000 | WARN | matches=8 prod_src=1 |
| C1 | CODE-owner@demoag | PASS | matches=20 prod_src=0 |
| C1 | CODE-testagency | PASS | matches=4 prod_src=0 |
| C1 | CODE-demoagency | PASS | matches=26 prod_src=0 |
| C1 | CODE-example.com | WARN | matches=42 prod_src=2 |
| C1 | CODE-placeholder | WARN | matches=98 prod_src=51 |
| C1 | CODE-mock | PASS | matches=25 prod_src=0 |
| C1 | CODE-fake | WARN | matches=10 prod_src=2 |
| C1 | CODE-demo | WARN | matches=43 prod_src=3 |
| C1 | PROD-HIT | WARN | src\lib\auth\session.ts contains "11111111-1111-1111-1111-111111111111" |
| C1 | PROD-HIT | WARN | src\lib\auth\session.ts contains "00000000-0000-0000-0000-000000000000" |
| C1 | PROD-HIT | WARN | src\lib\data\production-filters.ts contains "example.com" |
| C1 | PROD-HIT | WARN | src\lib\validations\fields.ts contains "example.com" |
| C1 | PROD-HIT | WARN | src\app\(auth)\forgot-password\page.tsx contains "placeholder" |
| C1 | PROD-HIT | WARN | src\app\(auth)\login\page.tsx contains "placeholder" |
| C1 | PROD-HIT | WARN | src\app\(auth)\onboarding\page.tsx contains "placeholder" |
| C1 | PROD-HIT | WARN | src\app\(auth)\signup\page.tsx contains "placeholder" |
| C1 | PROD-HIT | WARN | src\app\api\onboarding\options\route.ts contains "placeholder" |
| C1 | PROD-HIT | WARN | src\app\api\settings\matter-types\route.ts contains "placeholder" |
| C2 | PLACEHOLDER-AGENCIES | PASS | count=0 |
| C2 | DEMO-EMAILS-DB | PASS | ritiklabs_demo_users=0 total_demo=11 |
| C2 | EXAMPLE-URLS-DB | PASS | agencies_with_example.com=0 |
| C2 | RITIKLABS-PLACEHOLDER-CLIENTS | PASS | count=0 |
| C3 | BROWSER-DASHBOARD | PASS | clean |
| C3 | BROWSER-CLIENTS | PASS | clean |
| C3 | BROWSER-AGREEMENTS | PASS | clean |
| C3 | BROWSER-DOCUMENTS | PASS | clean |
| C3 | BROWSER-TEMPLATES | PASS | clean |
| C3 | BROWSER-SETTINGS | PASS | clean |
| C3 | BROWSER-BILLING | PASS | clean |
| C3 | BROWSER | PASS | Scanned 7 routes |
| C4 | API-/api/compliance/dashboard | PASS | status=200 |
| C4 | API-/api/clients/search | PASS | status=200 |
| C4 | API-/api/approvals | PASS | status=200 |
| C4 | API-/api/templates | PASS | status=200 |
| C4 | API-/api/notifications | PASS | status=200 |
| C4 | API-/api/search | PASS | status=200 |
| C1 | PRODUCTION-FILTERS | PASS | Demo client filter exists for compliance dashboard |

## Code Match Summary

| Pattern | Total files | Production `src/` hits |
|---------|-------------|------------------------|
| 11111111-1111-1111-1111-111111111111 | 16 | 1 |
| 00000000-0000-0000-0000-000000000000 | 8 | 1 |
| owner@demoagency.com | 20 | 0 |
| testagency | 4 | 0 |
| demoagency | 26 | 0 |
| example.com | 42 | 2 |
| placeholder | 98 | 51 |
| mock | 25 | 0 |
| fake | 10 | 2 |
| demo | 43 | 3 |

## Production `src/` references (expected guards)

- `src/lib/auth/session.ts` — blocks placeholder agency UUID login
- `src/lib/data/production-filters.ts` — filters demo emails from compliance metrics
- `src/lib/validations/fields.ts` — example.com in validation message text only

## Screenshots

- `docs/mock1-screenshots/mock-dashboard.png`
- `docs/mock1-screenshots/mock-clients.png`
- `docs/mock1-screenshots/mock-agreements.png`
- `docs/mock1-screenshots/mock-documents.png`
- `docs/mock1-screenshots/mock-templates.png`
- `docs/mock1-screenshots/mock-settings.png`
- `docs/mock1-screenshots/mock-billing.png`

**Final verdict: PASS**