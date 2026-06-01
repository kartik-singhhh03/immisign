-- Migration: tenant_rls_policies
-- Description: Complete Row Level Security strategy and generation of missing tenant entities.

-- 1. Create missing entities
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on new entities
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate a strict, uniform strategy
DROP POLICY IF EXISTS "Users access agency agreements" ON public.agreements;
DROP POLICY IF EXISTS "Users create agency agreements" ON public.agreements;
DROP POLICY IF EXISTS "Users update agency agreements" ON public.agreements;
-- (Assuming we drop all existing policies via a script in production, but here we explicitly define the required ones)

-- 4. Unified RLS Strategy for all Tenant Tables

-- CLIENTS
CREATE POLICY "tenant_clients_select" ON public.clients FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_clients_update" ON public.clients FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_clients_delete" ON public.clients FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- TEMPLATES
CREATE POLICY "tenant_templates_select" ON public.templates FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_templates_insert" ON public.templates FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_templates_update" ON public.templates FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_templates_delete" ON public.templates FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- APPROVALS
CREATE POLICY "tenant_approvals_select" ON public.approvals FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_approvals_insert" ON public.approvals FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_approvals_update" ON public.approvals FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_approvals_delete" ON public.approvals FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- AGREEMENTS
CREATE POLICY "tenant_agreements_select" ON public.agreements FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreements_insert" ON public.agreements FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreements_update" ON public.agreements FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreements_delete" ON public.agreements FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- DOCUMENTS
CREATE POLICY "tenant_documents_select" ON public.documents FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_documents_update" ON public.documents FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_documents_delete" ON public.documents FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- USERS
CREATE POLICY "tenant_users_select" ON public.users FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_users_update" ON public.users FOR UPDATE TO authenticated USING (agency_id = public.get_tenant() OR id = auth.uid());
CREATE POLICY "tenant_users_delete" ON public.users FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- SIGNERS
CREATE POLICY "tenant_signers_select" ON public.signers FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_signers_insert" ON public.signers FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_signers_update" ON public.signers FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_signers_delete" ON public.signers FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- SIGNATURES
CREATE POLICY "tenant_signatures_select" ON public.signatures FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_signatures_insert" ON public.signatures FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_signatures_update" ON public.signatures FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_signatures_delete" ON public.signatures FOR DELETE TO authenticated USING (agency_id = public.get_tenant());
