# AGR-2 Agreement & SignWell Production Audit

**Generated:** 2026-06-10T09:50:59.767Z
**Verdict:** **PASS**
**Agency:** Ritiklabs (`ritiklabs`)
**Actor:** nayramalik1018@gmail.com
**Client:** AGR-2 Production Client (`agr2.prod.1781084968345@immimate.au`)

## IDs

| Entity | ID |
|--------|-----|
| Client | `82ee4ced-bc90-41c3-b1c5-4cf0542d6c1a` |
| Matter | `7ff1b3ac-64a8-4d27-bf50-dd78a70468f9` |
| Agreement | `33a454ab-3ec3-4cb3-8788-817bf6dcc93a` |
| SignWell Document | `254bde7c-6d5b-48f5-b84d-a6a71bb70486` |
| Draft probe (Part 4) | `6efff59d-4648-4164-a6aa-d6adba5f8bf7` |

## Results

| Area | Check | Status | Detail |
|------|-------|--------|--------|
| SETUP | AUTH | PASS | nayramalik1018@gmail.com |
| SETUP | BROWSER | PASS | Chrome ready |
| PART1 | ONBOARDING | PASS | Fresh matter created |
| PART1 | CLIENT-ROW | PASS | name=AGR-2 Production Client |
| PART1 | MATTER-ROW | PASS | id=7ff1b3ac-64a8-4d27-bf50-dd78a70468f9 |
| PART1 | APPLICANT-ROW | PASS | 1 applicant(s) |
| PART1 | FINANCIAL-ROW | PASS | professional_fee context ok |
| PART2 | AGREEMENT-ROW | PASS | status=pending |
| PART2 | GENERATE-API | PASS | 3cd3a307-b7e5-4984-82d4-bf757e834afd/agreements/33a454ab-3ec3-4cb3-8788-817bf6dcc93a/agreement-AGR-2026-0016.pdf |
| PART2 | DOCUMENT-ROW | PASS | 3cd3a307-b7e5-4984-82d4-bf757e834afd/agreements/33a454ab-3ec3-4cb3-8788-817bf6dcc93a/agreement-AGR-2026-0016.pdf |
| PART2 | AGREEMENT-STATUS | PASS | status=pending |
| PART2 | STORAGE-PATH | PASS | 3cd3a307-b7e5-4984-82d4-bf757e834afd/agreements/33a454ab-3ec3-4cb3-8788-817bf6dcc93a/agreement-AGR-2026-0016.pdf |
| PART3 | PDF-HEADER | PASS | bytes=99821 |
| PART3 | PDF-METADATA-XREF | PASS | client=AGR-2 Production Client ref=AGR-2026-0016 |
| PART3 | PDF-CLIENT-NAME | PASS | client+agency (binary or metadata) |
| PART3 | PDF-MATTER-FEE | PASS | ref=AGR-2026-0016 |
| PART3 | PDF-SIG-PLACEHOLDER | PASS | signature markers |
| PART3 | PDF-OPEN | PASS | PDF opened in browser |
| PART4 | SIGNWELL-DRAFT-CREATE | PASS | 6efff59d-4648-4164-a6aa-d6adba5f8bf7 |
| PART4 | SIGNWELL-DRAFT-STATUS | PASS | status=Draft |
| PART4 | SIGNWELL-DRAFT-VISIBLE | PASS | GET /documents/{id} |
| PART5 | SEND-API | PASS | Successfully sent agreement. Agent signature applied automatically; external signers notified via SignWell. |
| PART5 | DB-SENT-STATUS | PASS | status=sent |
| PART5 | SIGNWELL-DOC-ID | PASS | 254bde7c-6d5b-48f5-b84d-a6a71bb70486 |
| PART5 | SIGNER-RECORDS | PASS | 0 signer row(s) + primary via client |
| PART5 | SIGNWELL-EMAIL | PASS | recipients=1 test_mode=true |
| PART5 | WEBHOOK-READY | PASS | 3 webhook_events so far (pipeline ready) |
| PART6 | WEBHOOK-VIEWED | PASS | status 200 |
| PART6 | WEBHOOK-COMPLETED | PASS | status 200 |
| PART6 | DB-SIGNED | PASS | {"status":"signed","signed_at":"2026-06-10T09:50:32.466+00:00","signwell_status":"completed"} |
| PART7 | SIGNATURE-ROW | PASS | agr2.prod.1781084968345@immimate.au @ 2026-06-10T09:50:32.466+00:00 |
| PART7 | WEBHOOK-EVENT-ID | PASS | a379513e-7b33-44a3-ab50-edef7c357aac |
| PART7 | IDEMPOTENCY | PASS | count 1 → 1 |
| PART8 | IN-APP-NOTIF | PASS | 1 notification(s) |
| PART8 | NOTIF-CENTER-API | PASS | api count=20 |
| PART8 | NOTIF-CENTER-UI | PASS | Ritiklabs Dashboard Service Agreements App Approvals Send Document Document Library Templates Client |
| PART8 | ACTIVITY-EVENTS | PASS | 1 activity_events |
| PART8 | ACTIVITY-LOGS | PASS | 3 agreement activity_logs |
| PART9 | EMAIL-AUDIT-ROWS | PASS | 1 Resend audit row(s) |
| PART9 | EMAIL-AUDIT-FIELDS | PASS | email_type/recipient/resend_id present |
| PART10 | STORAGE-EXISTS | PASS | agreement-AGR-2026-0016.pdf |
| PART10 | STORAGE-VIEW | PASS | status 200 |
| PART10 | STORAGE-DOWNLOAD | PASS | 96339 bytes |
| PART11 | WEBHOOK-EVENTS | PASS | 6 received/processed |
| PART11 | WEBHOOK-PAYLOAD-HASH | PASS | payload_hash column |
| PART11 | WEBHOOK-FAILURES | PASS | 0 failed |

## Screenshots

- `docs/agr2-screenshots/agreement-generated.png`
- `docs/agr2-screenshots/agreement-pdf.png`
- `docs/agr2-screenshots/agreement-sent.png`
- `docs/agr2-screenshots/agreement-signed.png`

## Notes

- Agreement signer emails are delivered by **SignWell**, not Resend — `email_delivery_audit` may have no rows for the send step.
- Webhook signing uses simulated `document_viewed` + `document_completed` events (test_mode SignWell).
- PDF text search uses binary substring matching (acceptable for generated agreement PDFs).

## Blockers

- None

**Final verdict: PASS**