-- Phase 16.9: Workflow integrity indexes + agreement_number lookup for workspace routes

CREATE INDEX IF NOT EXISTS idx_agreements_agency_number
  ON public.agreements (agency_id, agreement_number)
  WHERE agreement_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_agency_id
  ON public.clients (agency_id);

COMMENT ON INDEX idx_agreements_agency_number IS
  'Open Workspace links resolve by agreement_number or UUID';
