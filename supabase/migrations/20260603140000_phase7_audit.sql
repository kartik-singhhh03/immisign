-- Phase 7: agreement reference sequence, signature RLS fix, branding seeds

ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS role TEXT;

CREATE TABLE IF NOT EXISTS public.agreement_reference_counters (
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref_year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (agency_id, ref_year)
);

CREATE OR REPLACE FUNCTION public.allocate_agreement_reference(p_agency_id UUID, p_prefix TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    v_next INTEGER;
    v_prefix TEXT;
BEGIN
    INSERT INTO public.agreement_reference_counters (agency_id, ref_year, last_value)
    VALUES (p_agency_id, v_year, 1)
    ON CONFLICT (agency_id, ref_year)
    DO UPDATE SET last_value = public.agreement_reference_counters.last_value + 1
    RETURNING last_value INTO v_next;

    IF p_prefix IS NOT NULL AND length(trim(p_prefix)) > 0 THEN
        v_prefix := upper(trim(p_prefix));
    ELSE
        SELECT upper(left(replace(coalesce(slug, 'agr'), '-', ''), 3))
        INTO v_prefix
        FROM public.agencies
        WHERE id = p_agency_id;
    END IF;

    IF v_prefix IS NULL OR v_prefix = '' THEN
        v_prefix := 'AGR';
    END IF;

    RETURN v_prefix || '-' || v_year::TEXT || '-' || lpad(v_next::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_agreement_reference(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_agreement_reference(UUID, TEXT) TO service_role;

-- Fix user_signatures RLS: resolve agency from users row (JWT may lack agency_id claim)
DROP POLICY IF EXISTS "users_view_own_agency_signatures" ON public.user_signatures;
CREATE POLICY "users_view_own_agency_signatures"
    ON public.user_signatures FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        AND agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "users_insert_own_signature" ON public.user_signatures;
CREATE POLICY "users_insert_own_signature"
    ON public.user_signatures FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "users_update_own_signature" ON public.user_signatures;
CREATE POLICY "users_update_own_signature"
    ON public.user_signatures FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "users_delete_own_signature" ON public.user_signatures;
CREATE POLICY "users_delete_own_signature"
    ON public.user_signatures FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        AND agency_id = (SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid())
    );

-- Seed branding rows for agencies missing configuration
INSERT INTO public.branding_settings (agency_id, primary_color, secondary_color, font_family)
SELECT a.id, '#0D9F8C', '#081B2E', 'Inter'
FROM public.agencies a
WHERE NOT EXISTS (
    SELECT 1 FROM public.branding_settings b WHERE b.agency_id = a.id
);

-- Ensure matter_defaults rows exist for all agencies
INSERT INTO public.matter_defaults (agency_id)
SELECT a.id FROM public.agencies a
ON CONFLICT (agency_id) DO NOTHING;
