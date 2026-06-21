-- Clear users.signature_storage_path when default professional signature is removed
CREATE OR REPLACE FUNCTION public.clear_user_default_signature_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_default = true AND OLD.storage_path IS NOT NULL THEN
    UPDATE public.users
    SET
      signature_storage_path = NULL,
      signature_uploaded_at = NULL,
      updated_at = NOW()
    WHERE id = OLD.user_id
      AND signature_storage_path = OLD.storage_path;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS clear_user_default_signature_path ON public.user_signatures;
CREATE TRIGGER clear_user_default_signature_path
  AFTER DELETE ON public.user_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_user_default_signature_path();
