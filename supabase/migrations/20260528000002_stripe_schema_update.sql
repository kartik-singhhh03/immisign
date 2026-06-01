-- stripe_integration_schema_update.sql

-- Expand Stripe subscriptions model properly over Subscriptions referencing Plans natively
ALTER TABLE public.subscriptions 
DROP COLUMN IF EXISTS plan,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS plan_name TEXT,
ADD COLUMN IF NOT EXISTS billing_interval TEXT,
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Agency denormalizations
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'STARTER';

-- Establish Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    amount_due INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'aud',
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    status TEXT,
    billing_reason TEXT,
    paid_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view agency invoices" ON public.invoices FOR SELECT TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Idempotency Extension for Stripe Webhooks mapping webhook_logs
-- Requires: constraint webhook_logs_provider_event_id_key UNIQUE (provider, event_id) we created in signwell step.
