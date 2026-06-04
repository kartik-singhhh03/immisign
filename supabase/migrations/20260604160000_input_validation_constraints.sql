-- Server-side validation helpers and CHECK constraints for tenant contact fields.

CREATE OR REPLACE FUNCTION public.is_valid_phone(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p IS NULL
    OR btrim(p) = ''
    OR (
      p ~ '^\+?[0-9][0-9\s().\-+]{6,24}$'
      AND length(regexp_replace(p, '[^0-9]', '', 'g')) BETWEEN 8 AND 15
    );
$$;

CREATE OR REPLACE FUNCTION public.is_valid_abn(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p IS NULL
    OR btrim(p) = ''
    OR (
      length(regexp_replace(p, '\s', '', 'g')) = 11
      AND regexp_replace(p, '\s', '', 'g') ~ '^\d{11}$'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_valid_marn(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p IS NULL
    OR btrim(p) = ''
    OR (
      regexp_replace(p, '\s', '', 'g') ~ '^\d{7}$'
    );
$$;

-- Clear invalid legacy values before adding constraints
UPDATE public.clients SET phone = NULL WHERE phone IS NOT NULL AND NOT public.is_valid_phone(phone);
UPDATE public.users SET phone = NULL WHERE phone IS NOT NULL AND NOT public.is_valid_phone(phone);
UPDATE public.agencies SET phone = NULL WHERE phone IS NOT NULL AND NOT public.is_valid_phone(phone);
UPDATE public.agencies SET abn = NULL WHERE abn IS NOT NULL AND NOT public.is_valid_abn(abn);
UPDATE public.agencies SET marn = NULL WHERE marn IS NOT NULL AND NOT public.is_valid_marn(marn);

UPDATE public.agreements SET client_phone = NULL
WHERE client_phone IS NOT NULL AND NOT public.is_valid_phone(client_phone);

UPDATE public.rmas SET phone = NULL WHERE phone IS NOT NULL AND NOT public.is_valid_phone(phone);

-- Normalize legacy MARN values (keep NOT NULL); take last 7 digits when longer
UPDATE public.rmas
SET mara_number = right(regexp_replace(mara_number, '\D', '', 'g'), 7)
WHERE mara_number IS NOT NULL
  AND NOT public.is_valid_marn(mara_number)
  AND length(regexp_replace(mara_number, '\D', '', 'g')) >= 7;

UPDATE public.rmas
SET mara_number = lpad(regexp_replace(mara_number, '\D', '', 'g'), 7, '0')
WHERE mara_number IS NOT NULL
  AND NOT public.is_valid_marn(mara_number)
  AND length(regexp_replace(mara_number, '\D', '', 'g')) BETWEEN 1 AND 6;

UPDATE public.rmas
SET mara_number = '0000000'
WHERE mara_number IS NULL OR NOT public.is_valid_marn(mara_number);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'phone') THEN
    EXECUTE $q$
      UPDATE public.invitations SET phone = NULL
      WHERE phone IS NOT NULL AND NOT public.is_valid_phone(phone)
    $q$;
  END IF;
END $$;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_valid_chk;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_phone_valid_chk CHECK (public.is_valid_phone(phone));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_valid_chk;
ALTER TABLE public.users
  ADD CONSTRAINT users_phone_valid_chk CHECK (public.is_valid_phone(phone));

ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_phone_valid_chk;
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_phone_valid_chk CHECK (public.is_valid_phone(phone));

ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_abn_valid_chk;
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_abn_valid_chk CHECK (public.is_valid_abn(abn));

ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_marn_valid_chk;
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_marn_valid_chk CHECK (public.is_valid_marn(marn));

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_client_phone_valid_chk;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_client_phone_valid_chk CHECK (public.is_valid_phone(client_phone));

ALTER TABLE public.rmas DROP CONSTRAINT IF EXISTS rmas_phone_valid_chk;
ALTER TABLE public.rmas
  ADD CONSTRAINT rmas_phone_valid_chk CHECK (public.is_valid_phone(phone));

ALTER TABLE public.rmas DROP CONSTRAINT IF EXISTS rmas_mara_number_valid_chk;
ALTER TABLE public.rmas
  ADD CONSTRAINT rmas_mara_number_valid_chk CHECK (public.is_valid_marn(mara_number));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'phone') THEN
    EXECUTE 'ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_phone_valid_chk';
    EXECUTE 'ALTER TABLE public.invitations ADD CONSTRAINT invitations_phone_valid_chk CHECK (public.is_valid_phone(phone))';
  END IF;
END $$;
