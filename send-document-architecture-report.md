# Send Document Flow Architecture Report

**Phase 4B Requirement:** Implement a production-grade dispatch flow using Cloud Supabase, removing mock records and simulated progress bars.

## 1. Database Schema Refactor
To support the independent dispatch of custom uploaded documents without polluting the `agreements` table with fake records, we dropped the strict NOT NULL foreign key dependency on `agreements`:
- **`documents` table**: `agreement_id` is now optional (`NULL`). Standalone documents are now legally permitted to exist in the database.
- **`signers` table**: `agreement_id` is now optional (`NULL`). Added `document_id UUID REFERENCES documents(id) ON DELETE CASCADE`. Signers can now be attached directly to a standalone document.

## 2. Real Milestone Progress Pipeline
The `SendDocumentPage.tsx` was refactored to execute sequential, real operations instead of a simulated `setTimeout` progress bar.

1. **Upload Sequence (10% - 40%)**:
   - The document is passed to the `DocumentsRepository.create` hook.
   - It is securely uploaded to the `documents` Supabase Storage bucket.
   - A database record is inserted into the `documents` table without an `agreement_id`.
   - **Progress**: 40%

2. **Server Dispatch Sequence (60% - 80%)**:
   - The UI invokes the newly created `/api/documents/send` server route with the `documentId` and signers list.
   - The server validates the user and requests a temporary Signed URL (3600s) from Supabase Storage.
   - The server inserts the signers directly into the `signers` database table, linked to the `document_id`.
   - The server maps the signers to the SignWell API format and dispatches the signature request via `signwellClient.createDocument()` and `sendDocument()`.
   - **Progress**: 80%

3. **Audit Logging (100%)**:
   - Upon successful dispatch from SignWell, the server inserts a record into `activity_logs`.
   - The UI reaches 100% and transitions to the success screen, displaying real, verified success.

## 3. Error Handling
- If any stage of the upload or server dispatch fails, the UI progress bar is reset to `0%`.
- A distinct error screen is rendered (`hasError` state) displaying the explicit backend error message (e.g., "SignWell API rejected request" or "Storage upload failed"), with options to "Review & Try Again" or "Return to Dashboard".
