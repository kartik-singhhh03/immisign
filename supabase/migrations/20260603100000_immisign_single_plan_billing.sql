-- Phase 10: Single ImmiSign plan with seat-based billing

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS included_seats INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billable_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_base_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_seat_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_seat_item_id TEXT;

ALTER TABLE public.agencies
  ALTER COLUMN plan_type SET DEFAULT 'IMMISIGN';

UPDATE public.agencies
SET plan_type = 'IMMISIGN'
WHERE plan_type IS NULL
   OR plan_type IN ('free', 'STARTER', 'PRO', 'AGENCY', 'starter', 'pro', 'agency');

UPDATE public.subscriptions
SET plan_name = 'IMMISIGN',
    included_seats = COALESCE(included_seats, 3)
WHERE plan_name IS NULL
   OR plan_name IN ('STARTER', 'PRO', 'AGENCY', 'UNKNOWN', 'starter', 'pro', 'agency');

COMMENT ON COLUMN public.subscriptions.included_seats IS 'Seats included in base plan (default 3). Owner excluded from billable count.';
COMMENT ON COLUMN public.subscriptions.billable_seats IS 'Active non-owner users counted for billing.';
COMMENT ON COLUMN public.subscriptions.additional_seats IS 'max(0, billable_seats - included_seats) synced to Stripe seat line item.';
