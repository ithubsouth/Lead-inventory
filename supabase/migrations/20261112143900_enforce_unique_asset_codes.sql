CREATE OR REPLACE FUNCTION public.normalize_asset_code(code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN btrim(coalesce(code, '')) ~ '^[0-9]+$'
      THEN coalesce(nullif(ltrim(btrim(code), '0'), ''), '0')
    ELSE lower(btrim(coalesce(code, '')))
  END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.request_serials
    WHERE nullif(btrim(asset_code), '') IS NOT NULL
    GROUP BY public.normalize_asset_code(asset_code)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate asset codes already exist in request_serials. Resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.devices
    WHERE far_code IS NOT NULL
    GROUP BY far_code
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate asset codes already exist in devices. Resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.request_serials rs
    JOIN public.devices d
      ON public.normalize_asset_code(rs.asset_code) = public.normalize_asset_code(d.far_code::text)
     AND rs.serial_number IS DISTINCT FROM d.serial_number
    WHERE nullif(btrim(rs.asset_code), '') IS NOT NULL
      AND d.far_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'An asset code is assigned to different serials in request_serials and devices. Resolve the conflicts before applying this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_request_serials_unique_asset_code
  ON public.request_serials (public.normalize_asset_code(asset_code))
  WHERE nullif(btrim(asset_code), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_unique_far_code
  ON public.devices (far_code)
  WHERE far_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_unique_asset_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_code text;
BEGIN
  IF TG_TABLE_NAME = 'request_serials' THEN
    IF nullif(btrim(NEW.asset_code), '') IS NULL THEN
      RETURN NEW;
    END IF;
    normalized_code := public.normalize_asset_code(NEW.asset_code);
  ELSE
    IF NEW.far_code IS NULL THEN
      RETURN NEW;
    END IF;
    normalized_code := public.normalize_asset_code(NEW.far_code::text);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_code, 0));

  IF TG_TABLE_NAME = 'request_serials' THEN
    IF EXISTS (
      SELECT 1
      FROM public.request_serials rs
      WHERE rs.id IS DISTINCT FROM NEW.id
        AND nullif(btrim(rs.asset_code), '') IS NOT NULL
        AND public.normalize_asset_code(rs.asset_code) = normalized_code
    ) THEN
      RAISE unique_violation USING MESSAGE = 'Asset code is already assigned to another request serial.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.devices d
      WHERE d.far_code IS NOT NULL
        AND public.normalize_asset_code(d.far_code::text) = normalized_code
        AND d.serial_number IS DISTINCT FROM NEW.serial_number
    ) THEN
      RAISE unique_violation USING MESSAGE = 'Asset code is already assigned to a different device serial.';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.request_serials rs
      WHERE nullif(btrim(rs.asset_code), '') IS NOT NULL
        AND public.normalize_asset_code(rs.asset_code) = normalized_code
        AND rs.serial_number IS DISTINCT FROM NEW.serial_number
    ) THEN
      RAISE unique_violation USING MESSAGE = 'Asset code is already assigned to a different request serial.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_unique_asset_code_on_request_serials ON public.request_serials;
CREATE TRIGGER enforce_unique_asset_code_on_request_serials
  BEFORE INSERT OR UPDATE OF asset_code, serial_number ON public.request_serials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_asset_code();

DROP TRIGGER IF EXISTS enforce_unique_asset_code_on_devices ON public.devices;
CREATE TRIGGER enforce_unique_asset_code_on_devices
  BEFORE INSERT OR UPDATE OF far_code, serial_number, is_deleted ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_asset_code();
