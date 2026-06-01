DO $$ 
DECLARE
    v_new_agency UUID := 'd90c01d4-8d45-4217-a060-93a8d132b35a';
    v_new_owner UUID := 'f12c14a5-6735-4303-9d27-6f8d1688d042';
BEGIN
    -- Insert test agency
    INSERT INTO public.agencies (id, name, slug, email)
    VALUES (v_new_agency, 'Valid Test Agency', 'valid-test-agency', 'test@validagency.com')
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert test user into public.users
    INSERT INTO public.users (id, agency_id, email, full_name, role)
    VALUES (v_new_owner, v_new_agency, 'test@validagency.com', 'Test User', 'owner')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Seeded valid test agency: %', v_new_agency;
    RAISE NOTICE 'Seeded valid test user: %', v_new_owner;
END $$;
