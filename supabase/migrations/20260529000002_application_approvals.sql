-- 1. Create Application Approvals Table
CREATE TABLE IF NOT EXISTS public.application_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    visa_subclass VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    review_token VARCHAR(255) UNIQUE,
    document_path TEXT,
    version_number INT NOT NULL DEFAULT 1,
    revision_count INT NOT NULL DEFAULT 0,
    lodgement_deadline TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Create Approval Comments Table (For Requests Changes / General discussion)
CREATE TABLE IF NOT EXISTS public.approval_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES public.application_approvals(id) ON DELETE CASCADE,
    author_type VARCHAR(50) NOT NULL, -- 'agent' or 'client'
    author_id UUID, -- NULL if client (since they use a token)
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.application_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

-- Note: The review_token will be used in a secure unauthenticated edge function or 
-- explicit server actions bypassing RLS to allow the client to read/write specific fields.
