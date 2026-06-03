# Phase 10 — Stripe single-plan migration

## Business model

| Item | Price |
|------|-------|
| ImmiSign Plan (base) | $49/month |
| Included seats | 3 (owner excluded from count) |
| Additional seat | $10/month per active agent, RMA, admin, or staff |

**Formula:** `monthly = 49 + max(0, active_billable_users - 3) × 10`

## Stripe Dashboard setup

1. **Products** (Stripe Dashboard → Products):
   - **ImmiSign Plan** — recurring $49/month (AUD or USD per your market).
   - **ImmiSign Additional Seat** — recurring $10/month, usage type: licensed (quantity per subscription).

2. **Prices** — copy live/test price IDs into env:
   - `STRIPE_IMMISIGN_BASE_PRICE_ID`
   - `STRIPE_IMMISIGN_SEAT_PRICE_ID`

3. **Customer Portal** — Settings → Billing → Customer portal:
   - Enable subscription management, payment methods, invoices.

4. **Webhook** — `https://<your-app>/api/stripe/webhooks`:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.finalized`
   - `invoice.payment_failed`

5. **Automated setup (test mode):**
   ```bash
   node scripts/stripe-setup-immisign-plan.mjs
   ```

## Database migration

```bash
supabase db push
# or apply: supabase/migrations/20260603100000_immisign_single_plan_billing.sql
```

Adds `included_seats`, `billable_seats`, `additional_seats`, `stripe_seat_item_id` on `subscriptions` and normalizes `plan_type` to `IMMISIGN`.

## Migrating existing customers

1. Run SQL migration (above).
2. In Stripe, create new base + seat prices; do **not** delete old prices until subscriptions are migrated.
3. For each active agency subscription:
   - Note current team size (non-owner active users).
   - Cancel old multi-tier subscription at period end **or** migrate via Stripe support.
   - Owner completes new checkout from **Billing → Subscribe — $49/month** (seats auto-calculated).
4. Update Vercel env: remove `STRIPE_STARTER_*`, `STRIPE_PRO_*`, `STRIPE_AGENCY_*`; add `STRIPE_IMMISIGN_*`.
5. Verify webhook deliveries in Stripe Dashboard after deploy.

## Verification checklist

- [ ] `GET /api/stripe/billing` returns seat breakdown and monthly total
- [ ] Checkout creates subscription with base + seat line items
- [ ] Inviting user above 3 seats shows $10/month warning in Settings
- [ ] Accepting invite / deactivating user triggers seat sync (`POST /api/stripe/seats`)
- [ ] Webhook updates `subscriptions` and `invoices` tables
- [ ] Billing portal opens from billing page
- [ ] Marketing `/pricing` shows single plan only

```bash
node scripts/phase10-billing-verify.mjs
```
