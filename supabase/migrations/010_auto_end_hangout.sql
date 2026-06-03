-- Rolli: auto-end active hangouts after 24 hours

-- ---------------------------------------------------------------------------
-- auto_end_hangout_if_expired — end one hangout when past the limit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_end_hangout_if_expired(p_hangout_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_end_hours CONSTANT INTEGER := 24;
  v_updated INTEGER;
BEGIN
  UPDATE public.hangouts
  SET
    status = 'developing',
    ended_at = now()
  WHERE id = p_hangout_id
    AND status = 'active'
    AND started_at IS NOT NULL
    AND started_at + (v_auto_end_hours || ' hours')::INTERVAL <= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- auto_end_expired_hangouts — batch job for pg_cron (optional)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_end_expired_hangouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_end_hours CONSTANT INTEGER := 24;
  v_updated INTEGER;
BEGIN
  UPDATE public.hangouts
  SET
    status = 'developing',
    ended_at = now()
  WHERE status = 'active'
    AND started_at IS NOT NULL
    AND started_at + (v_auto_end_hours || ' hours')::INTERVAL <= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- ---------------------------------------------------------------------------
-- get_hangout_public — apply auto-end on read (poll-friendly)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_hangout_public(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
BEGIN
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_hangout.status = 'active' THEN
    PERFORM public.auto_end_hangout_if_expired(v_hangout.id);

    SELECT * INTO v_hangout
    FROM public.hangouts
    WHERE id = v_hangout.id;
  END IF;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_end_hangout_if_expired(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_end_expired_hangouts() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Optional pg_cron (enable "pg_cron" in Supabase Dashboard → Database → Extensions)
-- Then run once in SQL Editor:
--
-- SELECT cron.schedule(
--   'rolli-auto-end-hangouts',
--   '*/15 * * * *',
--   $$ SELECT public.auto_end_expired_hangouts(); $$
-- );
-- ---------------------------------------------------------------------------
