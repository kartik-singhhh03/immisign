-- APPLICATION-APPROVAL-REBUILD-1: Simplified client sign-off flow

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-approvals', 'application-approvals', false)
ON CONFLICT (id) DO NOTHING;

-- Extend storage policies for new bucket
DO $$ BEGIN
  CREATE POLICY "app_approvals_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'application-approvals');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_approvals_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-approvals');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_approvals_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'application-approvals');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_approvals_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'application-approvals');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rebuild columns on application_approvals
ALTER TABLE public.application_approvals
  ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_file_path TEXT,
  ADD COLUMN IF NOT EXISTS application_file_name TEXT,
  ADD COLUMN IF NOT EXISTS application_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS message_subject TEXT,
  ADD COLUMN IF NOT EXISTS message_body TEXT,
  ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_name_confirmed TEXT,
  ADD COLUMN IF NOT EXISTS client_ip TEXT,
  ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS change_request_reason TEXT;

-- Copy legacy review_token if present
UPDATE public.application_approvals
SET approval_token = review_token
WHERE approval_token IS NULL AND review_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_application_approvals_matter
  ON public.application_approvals (agency_id, matter_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_approvals_token
  ON public.application_approvals (approval_token)
  WHERE approval_token IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_approvals_agency_status_v2
  ON public.application_approvals (agency_id, status, sent_at DESC)
  WHERE deleted_at IS NULL;

-- Matter timeline events (append-only)
CREATE TABLE IF NOT EXISTS public.application_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES public.application_approvals(id) ON DELETE CASCADE,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_approval_events_approval
  ON public.application_approval_events (approval_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_approval_events_matter
  ON public.application_approval_events (matter_id, created_at DESC)
  WHERE matter_id IS NOT NULL;

ALTER TABLE public.application_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_approval_events_tenant ON public.application_approval_events;
CREATE POLICY app_approval_events_tenant ON public.application_approval_events
  FOR ALL TO authenticated
  USING (agency_id = public.get_tenant())
  WITH CHECK (agency_id = public.get_tenant());

-- Backfill status values toward simplified set
UPDATE public.application_approvals SET status = 'draft'
  WHERE status IN ('submitted', 'under_review', 'pending_review', 'pending', 'generated');

UPDATE public.application_approvals SET status = 'sent'
  WHERE status IN ('client_sent', 'awaiting_client') AND client_sent_at IS NOT NULL;

UPDATE public.application_approvals SET status = 'viewed'
  WHERE status = 'under_review' AND client_viewed_at IS NOT NULL;

UPDATE public.application_approvals SET status = 'approved'
  WHERE status IN ('signed', 'completed', 'ready_to_lodge', 'lodged') AND approved_at IS NOT NULL;

UPDATE public.application_approvals SET status = 'changes_requested'
  WHERE status IN ('changes_requested', 'rejected', 'declined') AND rejected_at IS NOT NULL;

COMMENT ON COLUMN public.application_approvals.status IS
  'draft | sent | viewed | approved | changes_requested | expired';
