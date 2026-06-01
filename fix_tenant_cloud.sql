CREATE OR REPLACE FUNCTION get_tenant() RETURNS UUID AS $$
  SELECT agency_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
