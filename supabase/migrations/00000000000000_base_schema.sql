-- ImmiSign Enterprise SaaS Database Architecture
-- Multi-Tenant PostgreSQL Schema

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'agent', 'reviewer', 'viewer', 'support');
CREATE TYPE agreement_status AS ENUM ('draft', 'pending', 'sent', 'viewed', 'signed', 'completed', 'expired', 'cancelled', 'rejected');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'cancelled', 'past_due', 'unpaid');
CREATE TYPE verification_method AS ENUM ('email', 'sms', 'otp', 'passport', 'manual');
CREATE TYPE notification_type AS ENUM ('agreement', 'billing', 'system', 'reminder', 'team');
CREATE TYPE signature_type AS ENUM ('drawn', 'typed', 'uploaded', 'certificate');

-- 3. Auth Helper Functions
-- Pull tenant ID straight from the JWT (required for strict RLS)
CREATE OR REPLACE FUNCTION public.get_tenant()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'agency_id')::UUID;
$$;

-- 4. Tables

-- Agencies
CREATE TABLE public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    timezone TEXT,
    subscription_status subscription_status DEFAULT 'trialing',
    plan_type TEXT DEFAULT 'free',
    max_users INTEGER DEFAULT 5,
    max_documents INTEGER DEFAULT 50,
    custom_domain TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Users (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role user_role DEFAULT 'agent',
    job_title TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- RMAs (Registered Migration Agents)
CREATE TABLE public.rmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mara_number TEXT NOT NULL,
    license_country TEXT DEFAULT 'Australia',
    license_expiry TIMESTAMPTZ,
    specializations JSONB,
    bio TEXT,
    signature_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agreements
CREATE TABLE public.agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    agreement_number TEXT NOT NULL,
    status agreement_status DEFAULT 'draft',
    template_id UUID, 
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    expires_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_signers INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Agreement Participants
CREATE TABLE public.agreement_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL, 
    order_index INTEGER DEFAULT 1,
    has_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    page_count INTEGER DEFAULT 1,
    checksum TEXT,
    storage_provider TEXT DEFAULT 'supabase',
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Signers (External Guests + Internal)
CREATE TABLE public.signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    signing_order INTEGER DEFAULT 1,
    verification_method verification_method DEFAULT 'email',
    verification_status TEXT DEFAULT 'pending',
    access_token TEXT UNIQUE,
    signed_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Signatures
CREATE TABLE public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    signature_type signature_type DEFAULT 'drawn',
    signature_data TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT NOT NULL,
    geo_location JSONB,
    device_info JSONB,
    audit_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    plan_name TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    status subscription_status DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Logs
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB,
    response JSONB,
    attempts INTEGER DEFAULT 1,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Invitations
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role DEFAULT 'agent',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- API Keys
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    permissions JSONB,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Branding Settings
CREATE TABLE public.branding_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#0f172a',
    secondary_color TEXT DEFAULT '#3b82f6',
    font_family TEXT DEFAULT 'Inter',
    custom_css TEXT,
    email_header TEXT,
    email_footer TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage Metrics
CREATE TABLE public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    documents_sent INTEGER DEFAULT 0,
    documents_signed INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    billing_period TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes (Performance Optimization)
CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agencies_status ON public.agencies(subscription_status);
CREATE INDEX idx_users_agency_id ON public.users(agency_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_agreements_agency_id ON public.agreements(agency_id);
CREATE INDEX idx_agreements_status ON public.agreements(status);
CREATE INDEX idx_agreements_number ON public.agreements(agreement_number);
CREATE INDEX idx_agreements_expires_at ON public.agreements(expires_at);
CREATE INDEX idx_documents_agreement_id ON public.documents(agreement_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_signers_agreement_id ON public.signers(agreement_id);
CREATE INDEX idx_signers_email ON public.signers(email);
CREATE INDEX idx_signers_token ON public.signers(access_token);
CREATE INDEX idx_audit_logs_agency_id ON public.audit_logs(agency_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- 6. Triggers and Functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at Triggers
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_rmas_updated_at BEFORE UPDATE ON public.rmas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_signers_updated_at BEFORE UPDATE ON public.signers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_branding_settings_updated_at BEFORE UPDATE ON public.branding_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_usage_metrics_updated_at BEFORE UPDATE ON public.usage_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Row Level Security Setup (Enterprise Isolation)

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;


-- 8. Policies

-- Agencies
CREATE POLICY "Users view own agency" ON public.agencies FOR SELECT TO authenticated USING (id = public.get_tenant());
CREATE POLICY "Admins update own agency" ON public.agencies FOR UPDATE TO authenticated USING (id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Users
CREATE POLICY "Users view same-agency users" ON public.users FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins manage agency users" ON public.users FOR ALL TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- RMAs
CREATE POLICY "Users view agency RMAs" ON public.rmas FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "RMAs update own record" ON public.rmas FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage RMAs" ON public.rmas FOR ALL TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Agreements
CREATE POLICY "Users access agency agreements" ON public.agreements FOR SELECT TO authenticated USING (agency_id = public.get_tenant() AND deleted_at IS NULL);
CREATE POLICY "Users create agency agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "Users update agency agreements" ON public.agreements FOR UPDATE TO authenticated USING (agency_id = public.get_tenant() AND deleted_at IS NULL);

-- Agreement Participants
CREATE POLICY "Users access agency participants" ON public.agreement_participants FOR ALL TO authenticated USING (agency_id = public.get_tenant());

-- Documents
CREATE POLICY "Users access agency documents" ON public.documents FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "Users upload agency documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());
CREATE POLICY "Users delete agency documents" ON public.documents FOR DELETE TO authenticated USING (agency_id = public.get_tenant());

-- Signers
CREATE POLICY "Users view agency signers" ON public.signers FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "Users manage agency signers" ON public.signers FOR ALL TO authenticated USING (agency_id = public.get_tenant());
-- Note: External guest signers would authenticate via a custom flow checking access_token equality, which would require extending RLS specifically for anonymous roles and tokens.

-- Signatures
CREATE POLICY "Users view agency signatures" ON public.signatures FOR SELECT TO authenticated USING (agency_id = public.get_tenant());

-- Audit Logs (Read/Append Only)
CREATE POLICY "Admins view agency audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager'));
CREATE POLICY "System appends audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());

-- Subscriptions
CREATE POLICY "Users view agency subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (agency_id = public.get_tenant());

-- Webhook Logs
CREATE POLICY "Admins view agency webhooks" ON public.webhook_logs FOR SELECT TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Invitations
CREATE POLICY "Users view agency invitations" ON public.invitations FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "Admins manage agency invitations" ON public.invitations FOR ALL TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Activity Logs
CREATE POLICY "Users view agency activity" ON public.activity_logs FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "System appends activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (agency_id = public.get_tenant());

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- API Keys
CREATE POLICY "Admins manage agency API keys" ON public.api_keys FOR ALL TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Branding Settings
CREATE POLICY "Users view agency branding" ON public.branding_settings FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
CREATE POLICY "Admins update agency branding" ON public.branding_settings FOR UPDATE TO authenticated USING (agency_id = public.get_tenant() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'admin'));

-- Usage Metrics
CREATE POLICY "Users view agency usage" ON public.usage_metrics FOR SELECT TO authenticated USING (agency_id = public.get_tenant());
