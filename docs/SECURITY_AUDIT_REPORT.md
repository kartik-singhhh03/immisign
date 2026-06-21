# Security Audit Report

**Generated:** 2026-06-21T11:28:05.812Z

## Summary

- Pattern scan hits (informational): **187** files
- Secret files staged for commit: **None**
- .env* tracked in git: **.env.example, .env.production.example**
- Safe to push (no env secrets staged): **YES**

## Staged secret files
_None_

## Tracked env files in git
- .env.example
- .env.production.example

## Pattern matches (review — may include false positives in docs/tests)

| File | Patterns |
|------|----------|
| .env.example | possible_secret_in_source |
| .env.local | possible_secret_in_source |
| .env.production.example | possible_secret_in_source |
| add-badges.mjs | demo_keyword |
| button-hardening-report.md | fake_keyword |
| critical-errors.md | mock_keyword |
| dashboard-performance-audit.md | mock_keyword |
| docs\AGR2_SIGNWELL_AUDIT.md | placeholder_keyword |
| docs\APPLICATION_APPROVAL_E2E_REPORT.md | mock_keyword |
| docs\BILL1_STRIPE_AUDIT.md | placeholder_keyword |
| docs\DASH1_PREMIUM_AUDIT.md | fake_keyword |
| docs\DB_REALITY_AUDIT.md | sequential_zeros |
| docs\DOC1_DOCUMENT_LIBRARY_AUDIT.md | mock_keyword |
| docs\e2e-evidence\agr2-run.json | placeholder_keyword |
| docs\e2e-evidence\beta1-run-1781080594756.json | example_com |
| docs\e2e-evidence\beta1-run-1781081102036.json | example_com |
| docs\e2e-evidence\beta1-run-1781081579373.json | example_com |
| docs\e2e-evidence\bill1-run-1781082502350.json | placeholder_keyword |
| docs\e2e-evidence\bill1-run-1781082793821.json | placeholder_keyword |
| docs\e2e-evidence\bill1-run-1781082889033.json | placeholder_keyword |
| docs\e2e-evidence\bill1-run-1781083020251.json | placeholder_keyword |
| docs\e2e-evidence\dash1-run.json | fake_keyword |
| docs\e2e-evidence\e2e3-run-1781078216357.json | example_com |
| docs\e2e-evidence\e2e3-run-1781078508626.json | example_com |
| docs\e2e-evidence\e2e31-run-1781079121174.json | example_com |
| docs\e2e-evidence\final-preflight.json | placeholder_keyword |
| docs\e2e-evidence\int1-verify-results.json | placeholder_keyword |
| docs\e2e-evidence\master-audit-1.json | sequential_ones, sequential_zeros, demo_keyword, mock_keyword, placeholder_keyword, example_com, fake_keyword |
| docs\e2e-evidence\mig-1-db-introspect.json | sequential_zeros |
| docs\e2e-evidence\mock1-run.json | sequential_ones, sequential_zeros, demo_keyword, mock_keyword, placeholder_keyword, example_com, fake_keyword |
| docs\e2e-evidence\release-hardening.json | mock_keyword |
| docs\e2e-evidence\website-build-1.json | demo_keyword |
| docs\E2E3_FULL_LIFECYCLE_REPORT.md | example_com |
| docs\ENVIRONMENT_AUDIT.md | placeholder_keyword |
| docs\INT1_INFRASTRUCTURE_AUDIT.md | placeholder_keyword |
| docs\MASTER_AUDIT_1_REPORT.md | sequential_ones, sequential_zeros, mock_keyword, placeholder_keyword |
| docs\MIGRATION_INVENTORY.md | sequential_zeros |
| docs\MOCK1_PRODUCTION_DATA_AUDIT.md | sequential_ones, sequential_zeros, demo_keyword, mock_keyword, placeholder_keyword, example_com, fake_keyword |
| docs\PAGINATION_REMEDIATION_REPORT.md | sequential_ones, sequential_zeros, demo_keyword, placeholder_keyword, example_com |
| docs\PLATFORM_BETA_AUDIT.md | mock_keyword, placeholder_keyword |

_… and 147 more._