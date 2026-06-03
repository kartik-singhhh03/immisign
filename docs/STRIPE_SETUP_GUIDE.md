# ImmiSign — Stripe Setup Guide (Owner / Non-Technical)

This guide walks you through connecting Stripe to ImmiSign for billing: **$49/month** for the workspace plus **3 included team seats**, and **$10/month** for each additional active user (owner is free).

**Time required:** about 45–60 minutes the first time.

---

## Before you start

You will need:

- Access to [Stripe Dashboard](https://dashboard.stripe.com)
- Access to your **Vercel** project (or wherever ImmiSign is hosted)
- Access to **Supabase** (database) — separate from Stripe
- A business email and bank account for payouts (Stripe will ask during onboarding)

---

## 1. Create your Stripe account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Choose **Australia** as your business country (ImmiSign pricing is in **AUD**).
3. Complete business verification (ABN, business type, bank account).
4. In **Settings → Business settings**, confirm:
   - Business name and support email
   - Statement descriptor (what customers see on card statements)
   - Customer emails enabled for receipts

**Screenshot to capture:** Dashboard home with business name visible → save as `docs/verification-screenshots/stripe-01-dashboard.png`

---

## 2. Create ImmiSign products and prices

You need **two recurring monthly prices** in Australian dollars.

### Product A — ImmiSign Subscription (base plan)

1. Stripe Dashboard → **Product catalog** → **+ Add product**
2. **Name:** `ImmiSign Plan`
3. **Description:** `One agency workspace, 3 included seats, unlimited agreements and signing.`
4. **Pricing:**
   - **Standard pricing**
   - **Recurring** → **Monthly**
   - **Price:** `49.00` **AUD**
5. Save the product.
6. Open the price you created and **copy the Price ID** (starts with `price_`).

This is your **`STRIPE_IMMISIGN_BASE_PRICE_ID`**.

### Product B — Additional user (per seat)

1. **+ Add product**
2. **Name:** `ImmiSign Additional Seat`
3. **Description:** `Per active team member above 3 included seats (owner not counted).`
4. **Pricing:**
   - **Recurring** → **Monthly**
   - **Price:** `10.00` **AUD**
5. Save and copy the **Price ID**.

This is your **`STRIPE_IMMISIGN_SEAT_PRICE_ID`**.

**Screenshot:** Product catalog showing both products → `stripe-02-products.png`

### Automated setup (developers only)

If a developer runs this in **test mode**:

```bash
node scripts/stripe-setup-immisign-plan.mjs
```

The script prints the two `price_...` IDs to paste into environment variables.

---

## 3. Obtain API credentials

### Secret key (`STRIPE_SECRET_KEY`)

1. Stripe Dashboard → **Developers** → **API keys**
2. For production, use **Live mode** (toggle top-right).
3. Copy **Secret key** (`sk_live_...` for production, `sk_test_...` for testing).

**Never** share this key or commit it to Git.

### Publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

Same page → copy **Publishable key** (`pk_live_...` or `pk_test_...`).

**Important:** Live secret + live publishable must match. Test secret + test publishable must match. Mixing live and test keys breaks checkout.

### Webhook signing secret (`STRIPE_WEBHOOK_SECRET`)

Created in step 4 below (`whsec_...`).

### Price IDs

From step 2:

- `STRIPE_IMMISIGN_BASE_PRICE_ID` = `price_...` for $49 plan  
- `STRIPE_IMMISIGN_SEAT_PRICE_ID` = `price_...` for $10 seat  

### Customer portal configuration (optional ID)

1. **Settings** → **Billing** → **Customer portal**
2. Configure branding and allowed actions (see section 5).
3. If Stripe shows a **Configuration ID** (`bpc_...`), you may store it as `STRIPE_CUSTOMER_PORTAL_CONFIGURATION` if your deployment uses it.

**Screenshot:** API keys page (blur the key values) → `stripe-03-api-keys.png`

---

## 4. Configure webhooks

Webhooks tell ImmiSign when a customer pays, when a subscription changes, or when payment fails.

### Production endpoint

Your live URL must be:

```text
https://YOUR-APP-DOMAIN/api/stripe/webhooks
```

Example: `https://app.immisign.com/api/stripe/webhooks`

### Steps

1. Stripe Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL:** paste the URL above
3. **Events to send** — select at least:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. Open the endpoint → **Signing secret** → **Reveal** → copy `whsec_...`

This is **`STRIPE_WEBHOOK_SECRET`**.

### Local testing (developers)

Use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhooks
```

The CLI prints a temporary `whsec_...` for `.env.local`.

**Screenshot:** Webhook endpoint list with your production URL → `stripe-04-webhooks.png`

---

## 5. Configure Customer Portal

1. **Settings** → **Billing** → **Customer portal**
2. Enable:
   - **Update payment methods**
   - **View invoices**
   - **Cancel subscription** (optional: cancel at period end only)
3. Disable features you do not want customers to change without contacting support.
4. Save configuration.

Owners open the portal from **Workspace → Billing → Manage subscription**.

**Screenshot:** Customer portal settings → `stripe-05-portal.png`

---

## 6. Environment variables (complete list)

| Variable | Purpose | Example | Where to get it |
|----------|---------|---------|-----------------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API | `sk_live_...` | Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser checkout (if used) | `pk_live_...` | Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures | `whsec_...` | Webhooks → endpoint → Signing secret |
| `STRIPE_IMMISIGN_BASE_PRICE_ID` | $49/month base line item | `price_...` | ImmiSign Plan product |
| `STRIPE_IMMISIGN_SEAT_PRICE_ID` | $10/month per extra seat | `price_...` | Additional Seat product |
| `STRIPE_CUSTOMER_PORTAL_CONFIGURATION` | Optional portal config ID | `bpc_...` | Settings → Customer portal |

Copy from `.env.production.example` in the repo — fill every value; do not commit real secrets.

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_IMMISIGN_BASE_PRICE_ID=
STRIPE_IMMISIGN_SEAT_PRICE_ID=
```

---

## 7. Configure Vercel

1. Open [Vercel Dashboard](https://vercel.com) → your ImmiSign project → **Settings** → **Environment Variables**
2. Add each Stripe variable for:
   - **Production** — live keys and live price IDs
   - **Preview** — test keys recommended
   - **Development** — test keys only (never use live keys on localhost unless intentional)
3. After saving, **Redeploy** production:
   - **Deployments** → latest production → **⋯** → **Redeploy**

Without redeploy, new variables are not available to the running app.

**Screenshot:** Vercel env vars list (values hidden) → `vercel-01-env.png`

---

## 8. Testing guide

Use **test mode** in Stripe (toggle in Dashboard) and **test keys** in a preview/dev environment.

### Test card (successful payment)

| Field | Value |
|-------|--------|
| Number | `4242 4242 4242 4242` |
| Expiry | Any future date |
| CVC | Any 3 digits |
| ZIP | Any |

### Successful subscription flow

1. Log in as **Owner**
2. Go to **Billing** → **Subscribe**
3. Complete Stripe Checkout with test card
4. Confirm **Billing** page shows active subscription and seat count
5. In Stripe Dashboard → **Customers** → verify subscription with 2 line items (base + seats)

### Failed payment flow

Use card `4000 0000 0000 0002` (generic decline). Confirm ImmiSign shows an error and webhook logs `invoice.payment_failed` if configured.

### Cancellation flow

1. **Billing** → **Manage subscription** (portal)
2. Cancel subscription
3. Confirm status updates after webhook delivery

### Seat billing verification

| Active billable users (excl. owner) | Extra seats charged | Monthly total |
|-------------------------------------|---------------------|---------------|
| 1–3 | 0 | $49 |
| 4 | 1 | $59 |
| 5 | 2 | $69 |

1. Invite users until you have 4 active non-owner members → accept invites
2. Run seat sync (automatic on invite accept) or ask developer to call `POST /api/stripe/seats`
3. Confirm Stripe subscription **quantity** on seat line item increases
4. Deactivate a user → confirm quantity decreases

**Script (developers):**

```bash
node scripts/phase11-2-seat-math-verify.mjs
node scripts/phase11-2-stripe-verify.mjs
```

---

## 9. Go-live checklist

- [ ] Live products and prices created in AUD  
- [ ] Live API keys in Vercel **Production** only  
- [ ] Webhook endpoint points to production URL  
- [ ] Webhook signing secret set in production  
- [ ] Test checkout completed once in test mode on staging  
- [ ] Owner can open Customer Portal  
- [ ] Seat math verified with 4th team member  

---

## 10. Getting help

- Stripe support: [https://support.stripe.com](https://support.stripe.com)  
- ImmiSign billing code: `src/lib/stripe/`, `src/app/api/stripe/`  
- Technical migration notes: `docs/STRIPE_MIGRATION_PHASE10.md`
