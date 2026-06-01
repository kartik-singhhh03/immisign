UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"agency_id": "11111111-1111-1111-1111-111111111111"}'::jsonb WHERE email = 'owner@demoagency.com';
