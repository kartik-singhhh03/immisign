DO $$ 
DECLARE
    v_old_agency UUID := '11111111-1111-1111-1111-111111111111';
    v_new_agency UUID := uuid_generate_v4();
    
    v_old_owner UUID := '22222222-2222-2222-2222-222222222221';
    v_new_owner UUID := uuid_generate_v4();
BEGIN
    -- Only run if old agency exists
    IF EXISTS (SELECT 1 FROM agencies WHERE id = v_old_agency) THEN
        
        -- Temporarily defer constraints if needed (though CASCADE should handle it if defined, 
        -- but Postgres doesn't cascade primary key updates easily unless ON UPDATE CASCADE is set).
        -- Since ON UPDATE CASCADE might not be set, we manually update the child tables first? No, we can't if FK restricts it.
        -- Let's just create a NEW agency and copy data, then delete the old one?
        -- Actually, the easiest way is to disable triggers, update everything, and re-enable triggers.
        
        RAISE NOTICE 'Updating agency ID to %', v_new_agency;
        
        -- Let's just insert a new agency and new user, then we can use those for testing.
        -- But wait, the user logs in as owner@demoagency.com, which is tied to auth.users.
        -- Updating auth.users id requires superuser or specific permissions. 
        
    END IF;
END $$;
