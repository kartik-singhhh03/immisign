BEGIN;
-- Set the local role to authenticated
SET LOCAL role authenticated;
-- Mock the JWT for user 22222222-2222-2222-2222-222222222221
SET LOCAL request.jwt.claims TO '{"sub": "22222222-2222-2222-2222-222222222221"}';

-- Try to insert a template
INSERT INTO public.templates (agency_id, name, content)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Template', '{"html": ""}');

ROLLBACK;
