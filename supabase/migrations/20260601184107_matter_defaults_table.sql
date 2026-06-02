CREATE TABLE IF NOT EXISTS public.matter_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
    default_professional_fee DECIMAL(10,2) DEFAULT 0.00,
    default_currency TEXT DEFAULT 'AUD',
    default_payment_terms TEXT DEFAULT '50% upfront, 50% on lodgement',
    require_second_reviewer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matter_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_matter_defaults_select" ON public.matter_defaults
    FOR SELECT TO authenticated USING (agency_id = public.get_tenant());

CREATE POLICY "tenant_matter_defaults_insert" ON public.matter_defaults
    FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());

CREATE POLICY "tenant_matter_defaults_update" ON public.matter_defaults
    FOR UPDATE TO authenticated USING (agency_id = public.get_tenant());

CREATE TRIGGER update_matter_defaults_updated_at BEFORE UPDATE ON public.matter_defaults
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert default rows for existing agencies
INSERT INTO public.matter_defaults (agency_id)
SELECT id FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;
