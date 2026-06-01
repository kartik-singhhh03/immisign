# ImmiSign Pre-Launch Checklist & Validation Report

This document serves as the final launch validation and blocker analysis for **ImmiSign**. Before exposing the SaaS portal to Registered Migration Agents (RMAs) and their visa clients, this checklist must be completely verified against production credentials.

---

## 1. Top 10 Critical Risks Remaining

Below are the ten highest-priority operational, security, and technical risks identified in the codebase that could block or impair the production release.

### ⚠️ [Risk 1] Serverless Puppeteer Timeout & Memory Constraints
- **Details**: The PDF generation service ([pdf.service.ts](file:///c:/Users/Lenovo/Desktop/immisign/src/features/agreements/services/pdf.service.ts)) runs `@sparticuz/chromium` using `puppeteer-core` inside Next.js serverless functions. Chrome cold-starts are CPU and memory-intensive.
- **Impact**: If a client's agreement or uploaded application contains complex CSS, large images, or external web fonts, generation may exceed Vercel's execution memory limit (default 1024MB on basic instances) or runtime execution limit (10s on Hobby tier, 15–30s on standard Pro). This results in a `504 Gateway Timeout` or `502 Bad Gateway` error.
- **Mitigation**: Configure Vercel serverless function memory to `3009MB` and extend timeouts to `60 seconds` for PDF generation server actions.

### ⚠️ [Risk 2] Unauthenticated Webhook Secret Validation Fallback
- **Details**: In [webhooks.ts](file:///c:/Users/Lenovo/Desktop/immisign/src/lib/signwell/webhooks.ts), if the `SIGNWELL_WEBHOOK_SECRET` environment variable is not defined, the service outputs a warning console log but **fully bypasses HMAC validation** to permit developers to work locally.
- **Impact**: If deployed to production without defining `SIGNWELL_WEBHOOK_SECRET` in the host dashboard, anyone can forge HTTP requests to the webhook URL (`/api/webhooks/signwell`) with fictitious payloads, artificially transitioning signed status, uploading unverified files, and falsifying audit trails.
- **Mitigation**: Add strict enforcement to fail the webhook process immediately in production if the signature is missing or the secret is empty.

### ⚠️ [Risk 3] Live RLS Policies Leakage under Complex Joins
- **Details**: The application is highly reliant on strict multi-tenancy. Row-Level Security (RLS) is enabled on all tables, filtering queries via `auth.uid()`. However, server actions and public routes (like the document token review page) must bypass RLS via a service-role client to access resources without standard user accounts.
- **Impact**: If token validation has any missing boundaries, a user could manipulate parameters (e.g., token strings or UUIDs) to request and view high-security documents (visas, passports, legal contracts) belonging to other agencies.
- **Mitigation**: Run extensive penetration queries using target-specific non-privileged tokens during staging manual QA to guarantee data boundaries remain impenetrable.

### ⚠️ [Risk 4] Absence of Queue & Dead Letter Queue (DLQ) for Failures
- **Details**: Integrations with SignWell, Resend, and Stripe execute synchronously inside API handlers and server actions with basic fetch retries. There is no persistent message queue system (like BullMQ or Inngest).
- **Impact**: If Resend or SignWell experiences a temporary service interruption, or the client closes their tab before an action completes, emails will fail to send and signature requests will drop. There is no automated retry loop or DLQ to capture, store, and replay failed calls.
- **Mitigation**: Introduce a background task logger or implement persistent Supabase-backed retry jobs for critical document lifecycle operations.

### ⚠️ [Risk 5] Vercel Serverless Gateway Timeout on Signed Document Storage
- **Details**: When a client signs an agreement in SignWell, the SignWell webhook triggers our server route. Our endpoint must:
  1. Retrieve and parse the payload.
  2. Perform an HTTP download of the finalized PDF from SignWell's servers.
  3. Stream/upload the raw bytes to Supabase Storage.
  4. Perform database updates and insert several compliance audit events.
- **Impact**: This multi-party handshake is executed synchronously in a single serverless thread. If the PDF is large, the serverless route might exceed Vercel's default execution timeout, leaving the agreement state out-of-sync with SignWell.
- **Mitigation**: Process webhooks asynchronously by returning an instant `200 OK` status back to SignWell, then dispatch the PDF retrieval to a background edge worker or queue script.

### ⚠️ [Risk 6] Multi-Tab Session Synchronization Conflicts
- **Details**: Session state is managed via Supabase auth cookies. In multiple open browser tabs, if a migration agent logs out from one tab, other tabs still render visual panels until a server request or token refresh triggers.
- **Impact**: If an agent attempts to execute changes in a stale tab, client-side actions might crash or return unhandled state errors, disrupting UX.
- **Mitigation**: Inject active window-focus and channel-broadcast state handlers to instantly redirect or alert user tabs upon authorization changes.

### ⚠️ [Risk 7] Static Local Browser Path Assumptions
- **Details**: The `PDFService` utilizes hardcoded OS paths (e.g. `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe` on Windows) to fall back during local development runs.
- **Impact**: Local staging and test suites running on developer systems without standard pathing (such as custom Linux, WSL, or developer containers) will crash when running PDF tests locally.
- **Mitigation**: Allow configuration of `CHROME_EXECUTABLE_PATH` via local `.env` variables to override defaults.

### ⚠️ [Risk 8] Unrestricted Signed URL Expiration Periods
- **Details**: Secure documents stored in the private `secure_documents` bucket are accessed via temporary signed URLs.
- **Impact**: If these URLs are generated with overly long lifespans (e.g., 24+ hours) and are copy-pasted or shared via email, unauthorized third parties can bypass all application auth parameters and view sensitive legal documents.
- **Mitigation**: Restrict the lifetime of generated signed URLs to a maximum of 15 minutes across all viewers.

### ⚠️ [Risk 9] Webhook Idempotency Race Conditions
- **Details**: Duplicate webhook processing is guarded via the `processed_webhooks` table.
- **Impact**: If a network retry occurs in sub-second intervals, two parallel server threads could check `processed_webhooks` simultaneously, find no record, and execute double state transitions or generate duplicate audit records.
- **Mitigation**: Rely on a unique database primary key constraint on `webhook_id` and execute inserts within strict transactional scopes to fail concurrent duplicate attempts.

### ⚠️ [Risk 10] Stripe Price ID Configuration Hazards
- **Details**: SaaS plan lookups maps to concrete Stripe Price IDs (such as Pro Plan, Agency Plan). 
- **Impact**: If price IDs are misconfigured on Vercel or do not match Stripe's live dashboard, the subscription lookup service will fail, preventing checkout flows and locking agencies out of the system.
- **Mitigation**: Validate price configurations at the application launch level and fall back gracefully with clear descriptive messages if mismatch errors occur.

---

## 2. Top 10 Manual QA Test Cases

These manual QA test cases must be fully executed and signed off in a staging environment connected to live API accounts (in Sandbox/Test modes) prior to launch.

| ID | Test Case Title | Scenario / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **QA-01** | **Multi-Tenant Data Isolation (RLS)** | Log into **Agency A** in Browser 1. Log into **Agency B** in Browser 2. Capture a document UUID from Agency A. In Browser 2, try to trigger a server action fetching this UUID. | Server action must throw a `403 Forbidden` or return `null`. Agency B must have no trace of Agency A's data. |
| **QA-02** | **Happy Path: Agreement Signature Lifecycle** | Create an agreement. Verify storage generated file. Open the signing link, complete e-signature, and verify the webhook processes correctly. | Status shifts from `Draft` -> `Sent` -> `Signed`. Finalized PDF downloaded automatically to `signed/completed.pdf`. |
| **QA-03** | **SignWell Webhook Idempotency Guard** | Re-post an identical `document_signed` webhook payload manually using Postman, using a duplicate `webhook_id` that is already in `processed_webhooks`. | Response must return `200 OK` instantly. No duplicate audit events or PDF generation tasks should execute. |
| **QA-04** | **PDF Version Preservation Compliance** | Complete an agreement signing loop. Check the Supabase Storage files under the specific agency bucket folder path. | Both the original `/generated/agreement.pdf` and `/signed/completed.pdf` must be present. The draft file must **never** be overwritten. |
| **QA-05** | **Application Approval Workflow Loop** | Upload a document for application review. Click "Request Changes" as a client with comments. Re-upload a corrected draft as the agent, then "Approve" as the client. | Database tracks version changes (`version_number` increments, `revision_count` increments). Comments and status changes appear on the audit timeline. |
| **QA-06** | **Public Token Access Boundary & Expiry** | Retrieve a review token URL. Attempt to access the page after removing characters from the token, or try an expired/deleted token. | Page must load a clean, descriptive `404 - Review Request Not Found` or `401 - Unauthorized Access` view instead of an application crash. |
| **QA-07** | **Stripe Pro Upgrade & Feature Release** | Select a pricing plan. Complete the Stripe checkout interface using a test credit card. Verify the redirect url is processed. | Agency tier upgrades to `pro`. Blocked features (e.g. infinite agreement generation) immediately become accessible. |
| **QA-08** | **Stripe Customer Portal Lifecycle** | Click "Manage Billing" in the SaaS settings panel after configuring a live customer subscription profile. | Successfully routes the user to the Stripe-hosted Customer Portal, displaying active subscription metadata and letting them return. |
| **QA-09** | **Resend Webhook Delivery Tracking** | Send an invite or agreement. Access Resend developer log. Emulate a Resend bounce or spam complaint webhook toward `/api/webhooks/resend`. | Email job status must transition to `failed` and record the delivery bounce description inside the compliance log history. |
| **QA-10** | **Session Expiry & Middlewares Redirection** | Open two tabs of the dashboard. Log out from Tab 1. Click a button triggering a server action in Tab 2. | Page must redirect the user smoothly back to `/login`, preserving the query return path (`/login?redirect=/workspace/...`). |

---

## 3. Known Assumptions Made During Development

The following architectural and business assumptions were adopted to deliver the MVP. If these assumptions are violated, further feature work is required.

1. **Single Client Signer Limit**: The agreement signing UI and SignWell interface assume a single client signer per agreement. Multi-party, witness, or sequential signing is supported in the database schema (`agreement_signatures` table) but not built into the frontend interface.
2. **Standard Chrome Paths**: It is assumed that the local development host has Google Chrome installed at default system-specific directory paths for the HTML-to-PDF compiler fallback.
3. **Resend Domain Ownership Verification**: It is assumed that the launching organization has full control over the DNS settings of `immisign.com` (or the launch domain) to set up SPF, DKIM, and DMARC settings in Resend.
4. **Vercel Pro Plan Deployment**: It is assumed that production hosting will utilize at least a Vercel Pro account to support longer execution limits (e.g., 30s+) for serverless handlers invoking Puppeteer and downloading files.
5. **No Concurrent Document Editing**: It is assumed that only one agent will modify a specific agreement or approval request at a time. The system does not lock documents or have real-time collaborative conflict warnings.
6. **Manual Supabase Storage Setup**: It is assumed that operations engineers will manually set up the Supabase project, configure the `secure_documents` bucket to **Private**, and run the migration scripts before launch.
7. **Single Billing Currency (AUD)**: The SaaS billing framework and professional agreements are modeled exclusively in Australian Dollars (AUD), which is the standard for Registered Migration Agents (RMAs).
8. **Public Webhook Exposure via Tunnel**: It is assumed that local developers testing Stripe, SignWell, or Resend webhooks will expose their local server endpoint using tools like `ngrok` or `localtunnel` to receive webhook events.
9. **No Heavy Scanning or OCR**: It is assumed that uploaded PDFs for client approvals are already text-readable. The system does not contain backend OCR, virus-scanning, or advanced document parsing.
10. **Safe Development Mode Bypass (`isSafeDevMode`)**: It is assumed that developers running without production environmental credentials should bypass dashboard login walls and payment portals to easily test client interactions and layout setups.

---

## 4. Areas That Require Real Credentials To Validate

The following critical features cannot be tested under Safe Development Mode and require production-ready external client keys to validate:

1. **Live E-Signature Dispatching**: Handshaking with the SignWell API, creating real document envelopes, mapping input fields, and generating client signing URLs.
2. **Stripe Billing Checkout & Portal Routing**: Generating actual checkout links, processing subscription webhooks, and accessing the secure Stripe-hosted Billing Portal.
3. **SMTP Transactional Mail Distribution**: Delivery of real invitation links, welcome sequences, reset emails, and document alerts to customer inboxes via Resend's API.
4. **Supabase RLS Policies & Private Storage**: Live checks for PostgreSQL permissions, JWT-based tenant checks, bucket upload blocks, and private signed URL generation.
5. **Production Serverless PDF Compilation**: Building, invoking, and executing the compiled `@sparticuz/chromium` binary inside the AWS Lambda/Vercel serverless platform.

---

## 5. Areas That Were Mocked During Development

To facilitate parallel engineering and enable developer testing without credentials, these features were bypassed or mocked:

1. **User Authentication & Profile Matching**:
   - *Mock*: `isSafeDevMode` automatically maps users to user `u-owner` (`owner@demoagency.com`, role `owner`, agency `w-avc`) without validating passwords or JWT tokens.
2. **Billing Status & Subscriptions**:
   - *Mock*: Access to pricing cards and dashboards is mocked to customer `cus_mock_12345` with default upgraded Pro-tier privileges.
3. **Static Sample Client Data**:
   - *Mock*: Client directory structures default to static mock profiles (Harpreet Kaur, Gurpreet Singh).
4. **Local PDF Source Fallback**:
   - *Mock*: The document viewer accesses local mock assets (`/mock-docs/form47sp.pdf`) rather than pulling generated or signed files from secure remote storage.
5. **Local Storage Database Mirroring**:
   - *Mock*: The approval requests engine (`MockApprovalRepository.ts`) writes directly to the browser's `localStorage` to simulate a fully functional database before migrations are pushed.

---

## 6. Production Deployment Sequence

Follow this exact sequence to deploy ImmiSign to production safely. **Do not bypass any step.**

```mermaid
graph TD
    A[1. Provision Prod Supabase] --> B[2. Run Schema & Migrations]
    B --> C[3. Create Private Storage Bucket]
    C --> D[4. Configure Stripe, SignWell & Resend]
    D --> E[5. Map Production Vercel Env Vars]
    E --> F[6. Seed Super Admin User]
    F --> G[7. Deploy Code to Vercel]
    G --> H[8. Verify Webhooks & Domain]
    H --> I[9. Complete QA Smoke Test]
    I --> J[10. LAUNCHED]
```

### Step 1: Provision Production Supabase Instance
- Create a fresh project inside the Supabase dashboard.
- Select a high-performance region (e.g., Sydney `ap-southeast-2` for Australian operations).

### Step 2: Push Database Schema & RLS Migrations
- Run migrations using the Supabase CLI:
  ```bash
  supabase db push --db-url "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
  ```
- Alternatively, execute the consolidated SQL files under the `supabase/` folder inside the Supabase SQL editor in this order:
  1. `schema.sql` (Creates core tables)
  2. `migrations/20260529000000_tenant_rls_policies.sql` (Applies RLS policies)
  3. `migrations/20260529000001_agreement_domain.sql` (Agreements framework)
  4. `migrations/20260529_application_approvals.sql` (Approvals framework)
  5. `migrations/20260529_signwell_tables.sql` (Signatures & idempotency)
  6. `email_schema_update.sql` (Email queuing framework)

### Step 3: Configure Secure Storage Bucket
- Under Supabase **Storage**, create a new bucket named exactly `secure_documents`.
- **Set the bucket to PRIVATE** (Toggle off "Public bucket").
- In RLS settings, ensure the policies defined in `schema.sql` are active, restricting access to signed URLs for authenticated agents and authorized guests.

### Step 4: Configure Third-Party Integrations
- **Stripe**:
  - Switch to Live Mode in Stripe.
  - Create the subscription products (Starter, Pro, Agency) and record the live `price_xxxx` price IDs.
  - Register a Stripe webhook endpoint pointing to `https://app.immisign.com/api/webhooks/stripe`. Subscribe to `customer.subscription.updated`, `customer.subscription.deleted`, and `checkout.session.completed`.
- **SignWell**:
  - Retrieve your live API Key.
  - Register a webhook pointing to `https://app.immisign.com/api/webhooks/signwell`. Subscribe to `document_signed`, `document_declined`, and `document_viewed`. Retrieve the webhook secret.
- **Resend**:
  - Add your domain (e.g., `immisign.com`) to Resend.
  - Add the designated TXT, MX, and CNAME records to your DNS host (e.g., Cloudflare, GoDaddy).
  - Retrieve the live API Key and set `RESEND_FROM_EMAIL` to your verified domain (e.g., `support@immisign.com`).
  - Register a webhook pointing to `https://app.immisign.com/api/webhooks/resend` to track bounces.

### Step 5: Configure Vercel Environment Variables
- Add the production variables on Vercel's settings dashboard matching [.env.production.example](file:///c:/Users/Lenovo/Desktop/immisign/.env.production.example):
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SIGNWELL_API_KEY`
  - `SIGNWELL_WEBHOOK_SECRET`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_STARTER_MONTHLY_PRICE_ID`
  - `STRIPE_PRO_MONTHLY_PRICE_ID`
  - `STRIPE_AGENCY_MONTHLY_PRICE_ID`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `RESEND_WEBHOOK_SECRET`

### Step 6: Provision Initial Super Admin User
- Manually create the primary administrator/owner profile inside the Supabase database.
  - Insert user in `auth.users`.
  - Create a corresponding record in the `public.profiles` table with `role = 'owner'` to configure the first agency workspace.

### Step 7: Execute Production Deploy
- Trigger the build on Vercel (`git push origin main` or `vercel --prod`).
- Ensure the bundle size reports clean code-splitting for all `/workspace/[agency]/agreements` and `/workspace/[agency]/approvals` routes.

### Step 8: Post-Deployment Smoke Test
- Run the manual QA test cases (specifically **QA-01**, **QA-02**, **QA-05**, **QA-07**) using real test-mode parameters to verify complete pipeline validation.

---

## 7. Estimated Time To Launch Once Credentials Are Provided

Once all production credentials (Supabase, Stripe, SignWell, Resend) are handed off, the final launch window requires **10 Hours** of consecutive work:

| Task Description | Core Focus | Est. Duration |
| :--- | :--- | :--- |
| **Infrastructure Handshake** | Provisioning live Supabase, database schema execution, private bucket configuration, and RLS checks. | 2.0 Hours |
| **API Dashboard Config** | Stripe products creation, SignWell API keys setup, Resend DNS routing updates, and active webhooks registration. | 1.5 Hours |
| **Vercel Setup & Build** | Environmental variables injection, Vercel deployments execution, and compilation validation checks. | 1.0 Hours |
| **Webhook Interoperability** | Executing local ngrok tunnel end-to-end webhook validation, verifying HMAC signature logic. | 2.0 Hours |
| **Manual QA Testing Plan** | Performing all 10 manual QA test cases across isolated client and agent workspaces. | 2.5 Hours |
| **Buffer & Configuration Fixes** | Resolving unexpected latency, serverless cold-start warnings, or minor styling adjustments. | 1.0 Hours |
| **TOTAL TIME TO LAUNCH** | **Production portal fully live, verified, and operational.** | **10.0 Hours** |
