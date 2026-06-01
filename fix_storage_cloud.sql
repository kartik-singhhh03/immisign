-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;

-- Create Tenant-Scoped Storage Policies
CREATE POLICY "Tenant Documents Read" ON storage.objects FOR SELECT TO authenticated USING (
    (bucket_id = ANY (ARRAY['agreements', 'documents', 'secure_documents'])) 
    AND (split_part(name, '/', 1)::uuid = public.get_tenant())
);

CREATE POLICY "Tenant Documents Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    (bucket_id = ANY (ARRAY['agreements', 'documents', 'secure_documents'])) 
    AND (split_part(name, '/', 1)::uuid = public.get_tenant())
);

CREATE POLICY "Tenant Documents Update" ON storage.objects FOR UPDATE TO authenticated USING (
    (bucket_id = ANY (ARRAY['agreements', 'documents', 'secure_documents'])) 
    AND (split_part(name, '/', 1)::uuid = public.get_tenant())
);

CREATE POLICY "Tenant Documents Delete" ON storage.objects FOR DELETE TO authenticated USING (
    (bucket_id = ANY (ARRAY['agreements', 'documents', 'secure_documents'])) 
    AND (split_part(name, '/', 1)::uuid = public.get_tenant())
);
