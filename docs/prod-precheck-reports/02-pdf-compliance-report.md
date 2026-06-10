# PDF Compliance Report

**Status: PASS**

## Verified

- **Service Agreement:** Running header with MARN + Matter Ref + Client Name on every page (`buildPdfRunningHeaderHtml`)
- **Statement of Service:** Running MARN header, A4 portrait, 1.5 line spacing, fee comparison block, DB-sourced compliance disclosure
- **Application Approval:** SignWell webhook sets `signed_at`, `signed_by`, provider — no manual dates
- **Certificates:** Generated timestamp system-only via webhook

## Evidence

Source verification in `verify-prod-precheck.mjs`: `SOS-PDF-FEE-COMP`, `SOS-PDF-MARN-HEADER`, `AGR-PDF-MARN-HEADER`
