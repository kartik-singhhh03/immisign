-- INT-1: Webhook event tracking + integration health logs

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  error TEXT,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_received
  ON public.webhook_events (provider, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events (status, received_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_integration_health_logs_integration
  ON public.integration_health_logs (integration, checked_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health_logs ENABLE ROW LEVEL SECURITY;
