-- N4: display short codes for registrations (not an access credential).
-- Format: AVO- + 6 Crockford base32 chars (0123456789ABCDEFGHJKMNPQRSTVWXYZ).

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS short_code text;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.gen_registration_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  body text;
  i int;
  idx int;
BEGIN
  body := '';
  FOR i IN 1..6 LOOP
    idx := 1 + floor(random() * length(alphabet))::int;
    body := body || substr(alphabet, idx, 1);
  END LOOP;
  RETURN 'AVO-' || body;
END;
$$;

-- Unique index first so backfill collision retries work.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_short_code_upper_uidx
  ON public.registrations (upper(short_code));

DO $$
DECLARE
  r record;
  candidate text;
  attempts int;
BEGIN
  FOR r IN
    SELECT id FROM public.registrations WHERE short_code IS NULL OR btrim(short_code) = ''
  LOOP
    attempts := 0;
    LOOP
      attempts := attempts + 1;
      candidate := private.gen_registration_short_code();
      BEGIN
        UPDATE public.registrations
        SET short_code = candidate
        WHERE id = r.id;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          IF attempts >= 32 THEN
            RAISE EXCEPTION 'Could not allocate short_code for registration %', r.id;
          END IF;
      END;
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.registrations
  ALTER COLUMN short_code SET NOT NULL;

COMMENT ON COLUMN public.registrations.short_code IS
  'Human display/search code (AVO-XXXXXX). Not an access credential; ticket URL uses registration UUID.';
