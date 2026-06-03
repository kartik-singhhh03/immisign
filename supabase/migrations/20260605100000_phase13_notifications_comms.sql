-- Phase 13: Notifications, preferences, tasks, deadlines (no billing changes)

DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'document';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'comment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'checklist';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_agency_type
  ON public.notifications (agency_id, type, created_at DESC);

-- User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_agreements BOOLEAN NOT NULL DEFAULT true,
  email_approvals BOOLEAN NOT NULL DEFAULT true,
  email_documents BOOLEAN NOT NULL DEFAULT true,
  email_team BOOLEAN NOT NULL DEFAULT true,
  email_system BOOLEAN NOT NULL DEFAULT true,
  in_app_agreements BOOLEAN NOT NULL DEFAULT true,
  in_app_approvals BOOLEAN NOT NULL DEFAULT true,
  in_app_documents BOOLEAN NOT NULL DEFAULT true,
  in_app_team BOOLEAN NOT NULL DEFAULT true,
  in_app_system BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, agency_id)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notification_prefs_select"
  ON public.user_notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND agency_id = public.get_tenant());

CREATE POLICY "user_notification_prefs_upsert"
  ON public.user_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND agency_id = public.get_tenant())
  WITH CHECK (user_id = auth.uid() AND agency_id = public.get_tenant());

-- Agency tasks
CREATE TABLE IF NOT EXISTS public.agency_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id UUID,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_tasks_assigned
  ON public.agency_tasks (agency_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_agency_tasks_entity
  ON public.agency_tasks (agency_id, entity_type, entity_id);

ALTER TABLE public.agency_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agency_tasks_select"
  ON public.agency_tasks FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());

CREATE POLICY "tenant_agency_tasks_insert"
  ON public.agency_tasks FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = public.get_tenant()
    AND created_by = auth.uid()
  );

CREATE POLICY "tenant_agency_tasks_update"
  ON public.agency_tasks FOR UPDATE TO authenticated
  USING (
    agency_id = public.get_tenant()
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  );

-- Approval deadline / reminder tracking
ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminders_sent JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Secure notification creation (tenant-scoped)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_agency_id UUID,
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
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
    entity_type, entity_id, actor_id, is_read
  ) VALUES (
    p_agency_id, p_user_id, p_type, p_title, p_message, p_action_url,
    p_entity_type, p_entity_id, p_actor_id, false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO service_role;
