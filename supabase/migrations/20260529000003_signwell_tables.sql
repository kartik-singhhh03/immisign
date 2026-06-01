-- 1. Create Webhook Idempotency Table
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    webhook_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Agreement Signatures Table
CREATE TABLE IF NOT EXISTS public.agreement_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    signer_role VARCHAR(255) NOT NULL, -- e.g. 'client', 'co-signer', 'witness', 'agent'
    signwell_signer_id VARCHAR(255),
    signing_url TEXT,
    signed_at TIMESTAMPTZ,
    ip_address VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;

-- Note: processed_webhooks is typically written by a service role, so we can leave it strict or grant insert/select to service role.
-- agreement_signatures inherits tenant access through agreement_id, but for now we will grant service_role full access.
