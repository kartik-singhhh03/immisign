-- MIG-1 Reconciliation: idempotent — adds only missing NTF-1 / INT-1 / RSD-1 objects
-- Safe to run multiple times. Does NOT drop data or recreate existing tables.

-- Enums
DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('critical', 'high', 'normal', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_scope AS ENUM ('personal', 'team', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_digest_frequency AS ENUM ('immediate', 'hourly', 'daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NTF-1 notification columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority public.notification_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS scope public.notification_scope NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS workflow_category TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_inbox
  ON public.notifications (user_id, agency_id, deleted_at, is_read, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_assigned
  ON public.notifications (assigned_to_user_id, agency_id, created_at DESC)
  WHERE deleted_at IS NULL AND assigned_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_due
  ON public.notifications (user_id, due_at)
  WHERE deleted_at IS NULL AND due_at IS NOT NULL;

-- Activity events (NTF-1)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  file_source TEXT,
  file_id UUID,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_agency_time
  ON public.activity_events (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_client
  ON public.activity_events (agency_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_notification
  ON public.activity_events (notification_id)
  WHERE notification_id IS NOT NULL;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_events_select_tenant ON public.activity_events;
CREATE POLICY activity_events_select_tenant
  ON public.activity_events FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

DROP POLICY IF EXISTS activity_events_insert_tenant ON public.activity_events;
CREATE POLICY activity_events_insert_tenant
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant());

-- Digest preferences (NTF-1)
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_digest_frequency public.email_digest_frequency NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS email_compliance BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_compliance BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_sos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_sos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_file_notes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_file_notes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- INT-1 webhook + health logs
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

DROP POLICY IF EXISTS "Owners and admins view webhook events" ON public.webhook_events;
CREATE POLICY "Owners and admins view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = public.get_tenant());

DROP POLICY IF EXISTS "Owners and admins view integration health logs" ON public.integration_health_logs;
CREATE POLICY "Owners and admins view integration health logs"
  ON public.integration_health_logs FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = public.get_tenant());

-- RSD-1 email delivery audit
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

DROP POLICY IF EXISTS "Owners and admins view email delivery audit" ON public.email_delivery_audit;
CREATE POLICY "Owners and admins view email delivery audit"
  ON public.email_delivery_audit FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = public.get_tenant());

-- Extended notification RPC
CREATE OR REPLACE FUNCTION public.create_notification(
  p_agency_id UUID,
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_priority public.notification_priority DEFAULT 'normal',
  p_scope public.notification_scope DEFAULT 'personal',
  p_assigned_to_user_id UUID DEFAULT NULL,
  p_due_at TIMESTAMPTZ DEFAULT NULL,
  p_workflow_category TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_agency_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'agency_id and user_id required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_user_id AND u.agency_id = p_agency_id
  ) THEN
    RAISE EXCEPTION 'user not in agency';
  END IF;

  INSERT INTO public.notifications (
    agency_id, user_id, type, title, message, action_url,
    entity_type, entity_id, actor_id, is_read,
    priority, scope, assigned_to_user_id, due_at, workflow_category, metadata
  ) VALUES (
    p_agency_id, p_user_id, p_type, p_title, p_message, p_action_url,
    p_entity_type, p_entity_id, p_actor_id, false,
    COALESCE(p_priority, 'normal'), COALESCE(p_scope, 'personal'),
    COALESCE(p_assigned_to_user_id, p_user_id), p_due_at, p_workflow_category, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Realtime (NTF-1)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
