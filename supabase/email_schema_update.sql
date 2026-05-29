-- email_schema_update.sql

-- Establish async email jobs table for reliable and retry-able delivery queue
CREATE TABLE IF NOT EXISTS public.email_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, sent, failed
    attempts INTEGER DEFAULT 0,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Establish webhooks event tracker for Resend
CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_job_id UUID REFERENCES public.email_jobs(id) ON DELETE CASCADE,
    provider_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and Admins view agency email jobs" ON public.email_jobs FOR SELECT TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Owners and Admins view agency email events" ON public.email_events FOR SELECT TO authenticated USING (
    email_job_id IN (SELECT id FROM public.email_jobs WHERE agency_id = public.get_tenant()) AND 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
