DO $$ 
DECLARE
  v_err TEXT;
BEGIN
  -- Set local session to authenticated
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222221"}', true);

  BEGIN
    INSERT INTO public.templates (agency_id, name, content)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Template DO Block', '{"html": ""}');
    RAISE NOTICE 'Insert successful!';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE EXCEPTION 'Insert failed: %', v_err;
  END;
END $$;
