-- Migration: agreement_domain
-- Description: Core schema additions for Agreement Module

-- 1. Matter Types
CREATE TABLE IF NOT EXISTS public.matter_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agreement Clauses
CREATE TABLE IF NOT EXISTS public.agreement_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Payment Schedules (Lightweight)
CREATE TABLE IF NOT EXISTS public.payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'AUD',
    status TEXT DEFAULT 'pending',
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alter Agreements Table to link to Clients and Matter Types
ALTER TABLE public.agreements 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS matter_type_id UUID REFERENCES public.matter_types(id) ON DELETE SET NULL;

-- 5. Enable RLS
ALTER TABLE public.matter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- 6. Add Policies
-- MATTER TYPES
CREATE POLICY "tenant_matter_types_select" ON public.matter_types FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_matter_types_insert" ON public.matter_types FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_matter_types_update" ON public.matter_types FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_matter_types_delete" ON public.matter_types FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- AGREEMENT CLAUSES
CREATE POLICY "tenant_agreement_clauses_select" ON public.agreement_clauses FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreement_clauses_insert" ON public.agreement_clauses FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreement_clauses_update" ON public.agreement_clauses FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_agreement_clauses_delete" ON public.agreement_clauses FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- PAYMENT SCHEDULES
CREATE POLICY "tenant_payment_schedules_select" ON public.payment_schedules FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_payment_schedules_insert" ON public.payment_schedules FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "tenant_payment_schedules_update" ON public.payment_schedules FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "tenant_payment_schedules_delete" ON public.payment_schedules FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- 7. Add Triggers
CREATE TRIGGER update_matter_types_updated_at BEFORE UPDATE ON public.matter_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_agreement_clauses_updated_at BEFORE UPDATE ON public.agreement_clauses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
