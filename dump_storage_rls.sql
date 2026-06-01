SELECT tablename, policyname, permissive, roles::text, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;
