-- ImmiSign Database Schema & Multi-Tenant Architecture

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'migration_agent', 'assistant', 'read_only');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing');
CREATE TYPE agreement_status AS ENUM ('draft', 'pending', 'viewed', 'signed', 'canceled', 'expired');

-- 3. Core Tables

-- Agencies (Tenants)
CREATE TABLE public.agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'migration_agent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL,
    status subscription_status NOT NULL,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    visa_type TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agreements
CREATE TABLE public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status agreement_status DEFAULT 'draft',
    signwell_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agreement_id UUID REFERENCES public.agreements(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Storage Buckets
-- (Note: run these through Supabase Storage API or UI generally, but illustrative here)
-- insert into storage.buckets (id, name, public) values ('agreements', 'agreements', false);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- 5. Indexes for Performance & Scalability
CREATE INDEX idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX idx_agreements_agency_id ON public.agreements(agency_id);
CREATE INDEX idx_documents_agency_id ON public.documents(agency_id);
CREATE INDEX idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX idx_audit_logs_agency_id ON public.audit_logs(agency_id);
CREATE INDEX idx_agreements_client_id ON public.agreements(client_id);
CREATE INDEX idx_documents_agreement_id ON public.documents(agreement_id);
CREATE INDEX idx_agencies_slug ON public.agencies(slug);


-- 6. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user's agency_id
CREATE OR REPLACE FUNCTION public.get_current_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT agency_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agencies Policies
CREATE POLICY "Users can view their own agency"
ON public.agencies FOR SELECT
TO authenticated
USING (id = public.get_current_agency_id());

CREATE POLICY "Owners and admins can update their agency"
ON public.agencies FOR UPDATE
TO authenticated
USING (
  id = public.get_current_agency_id() AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'admin')
);

-- Profiles Policies
CREATE POLICY "Users can view profiles in their agency"
ON public.profiles FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can update any profile in their agency"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  agency_id = public.get_current_agency_id() AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'admin')
);

-- Clients Policies
CREATE POLICY "Tenant isolation for clients SELECT"
ON public.clients FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for clients INSERT"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for clients UPDATE"
ON public.clients FOR UPDATE
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for clients DELETE"
ON public.clients FOR DELETE
TO authenticated
USING (agency_id = public.get_current_agency_id());

-- Agreements Policies
CREATE POLICY "Tenant isolation for agreements SELECT"
ON public.agreements FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for agreements INSERT"
ON public.agreements FOR INSERT
TO authenticated
WITH CHECK (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for agreements UPDATE"
ON public.agreements FOR UPDATE
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for agreements DELETE"
ON public.agreements FOR DELETE
TO authenticated
USING (agency_id = public.get_current_agency_id());

-- Documents Policies
CREATE POLICY "Tenant isolation for documents SELECT"
ON public.documents FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for documents INSERT"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for documents UPDATE"
ON public.documents FOR UPDATE
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "Tenant isolation for documents DELETE"
ON public.documents FOR DELETE
TO authenticated
USING (agency_id = public.get_current_agency_id());

-- Subscriptions Policies
CREATE POLICY "Users can view their agency subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

-- Audit Logs Policies
CREATE POLICY "Users can view audit logs for their agency"
ON public.audit_logs FOR SELECT
TO authenticated
USING (agency_id = public.get_current_agency_id());

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (agency_id = public.get_current_agency_id());

-- Create Trigger for automatically setting updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
