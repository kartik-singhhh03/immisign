BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "22222222-2222-2222-2222-222222222221"}';
SELECT get_tenant();
COMMIT;
