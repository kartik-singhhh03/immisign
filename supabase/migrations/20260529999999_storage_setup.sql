-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('agreements', 'agreements', false),
('documents', 'documents', false),
('avatars', 'avatars', true),
('secure_documents', 'secure_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for storage.objects

-- Allow public access to avatars
CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Users can update their avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );

-- Private buckets (agreements, documents, secure_documents)
-- For a multi-tenant B2B app, usually we check if the user is authenticated. 
-- In a real prod setup we would parse the path to ensure tenant isolation (e.g. bucket_id/agency_id/file).
-- For this bootstrap, we ensure only authenticated users can read/write.
CREATE POLICY "Authenticated Read Access"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id IN ('agreements', 'documents', 'secure_documents') );

CREATE POLICY "Authenticated Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('agreements', 'documents', 'secure_documents') );

CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id IN ('agreements', 'documents', 'secure_documents') );

CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id IN ('agreements', 'documents', 'secure_documents') );
