-- 1. Create a function to get the current user's role, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- 2. Update the policy to use the new function to avoid infinite recursion
DROP POLICY IF EXISTS "Admins manage agency users" ON public.users;

CREATE POLICY "Admins manage agency users" ON public.users
FOR ALL
USING (
  agency_id = get_tenant() AND 
  get_user_role() IN ('owner', 'admin')
);
