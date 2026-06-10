-- GS-1: Global search — history, saved searches, analytics + performance indexes

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INT NOT NULL DEFAULT 0,
  clicked_result_type TEXT,
  clicked_result_id TEXT,
  clicked_result_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
  ON public.search_history (agency_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches (agency_id, user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_agency_time
  ON public.search_analytics (agency_id, created_at DESC);

-- Performance indexes for global search ilike queries
CREATE INDEX IF NOT EXISTS idx_clients_agency_name
  ON public.clients (agency_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_agency_client_number
  ON public.clients (agency_id, client_number)
  WHERE client_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agreements_agency_number
  ON public.agreements (agency_id, agreement_number)
  WHERE agreement_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_agency_number
  ON public.application_approvals (agency_id, approval_number)
  WHERE approval_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_agency_filename
  ON public.documents (agency_id, file_name);

CREATE INDEX IF NOT EXISTS idx_file_notes_agency_body
  ON public.file_notes (agency_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_statements_agency_number
  ON public.service_statements (agency_id, statement_number)
  WHERE statement_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_title
  ON public.notifications (agency_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_agency_title
  ON public.activity_logs (agency_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_history_select_tenant
  ON public.search_history FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY search_history_insert_tenant
  ON public.search_history FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY search_history_delete_own
  ON public.search_history FOR DELETE TO authenticated
  USING (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY saved_searches_select_tenant
  ON public.saved_searches FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY saved_searches_insert_tenant
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY saved_searches_update_own
  ON public.saved_searches FOR UPDATE TO authenticated
  USING (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY saved_searches_delete_own
  ON public.saved_searches FOR DELETE TO authenticated
  USING (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY search_analytics_insert_tenant
  ON public.search_analytics FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_tenant() AND user_id = auth.uid());

CREATE POLICY search_analytics_select_tenant
  ON public.search_analytics FOR SELECT TO authenticated
  USING (agency_id = public.get_tenant());
