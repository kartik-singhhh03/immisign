-- RSD-1: Email delivery audit trail

CREATE TABLE IF NOT EXISTS public.email_delivery_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'resend',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  email_type TEXT,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_audit_resend_id
  ON public.email_delivery_audit (resend_id)
  WHERE resend_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_delivery_audit_recipient
  ON public.email_delivery_audit (recipient, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_audit_status
  ON public.email_delivery_audit (status, created_at DESC);

ALTER TABLE public.email_delivery_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins view email delivery audit"
  ON public.email_delivery_audit FOR SELECT TO authenticated
  USING (
    agency_id IS NULL
    OR agency_id = public.get_tenant()
  );
