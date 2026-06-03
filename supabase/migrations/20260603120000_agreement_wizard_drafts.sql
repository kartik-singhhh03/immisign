-- Persist in-progress agreement wizard state per user/agency
CREATE TABLE IF NOT EXISTS public.agreement_wizard_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL DEFAULT '{}',
    current_step INTEGER NOT NULL DEFAULT 0,
    agreement_ref TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (agency_id, user_id)
);

ALTER TABLE public.agreement_wizard_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wizard drafts"
    ON public.agreement_wizard_drafts
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND agency_id = public.get_tenant())
    WITH CHECK (user_id = auth.uid() AND agency_id = public.get_tenant());

-- Optional metadata column on payment_schedules for disbursements label
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS metadata JSONB;
