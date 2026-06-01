SELECT tablename, policyname, permissive, roles::text, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'agencies', 'users', 'clients', 'agreements', 'documents', 'templates', 
  'matter_types', 'payment_schedules', 'application_approvals', 'activity_logs', 
  'approval_comments', 'agreement_clauses', 'agreement_signatures', 'signers', 'signatures'
)
ORDER BY tablename, policyname;
