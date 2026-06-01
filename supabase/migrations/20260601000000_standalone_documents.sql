-- Phase 4B Migration: Allow standalone documents and link signers to documents
ALTER TABLE public.documents ALTER COLUMN agreement_id DROP NOT NULL;
ALTER TABLE public.signers ALTER COLUMN agreement_id DROP NOT NULL;
ALTER TABLE public.signers ADD COLUMN document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_signers_document_id ON public.signers(document_id);
