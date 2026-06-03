-- Rolli: purge hangouts and storage after retention period (default 7 days)
--
-- Deletes hangout rows (participants, photos, votes, upload slots cascade) and
-- objects in the hangout-photos bucket for each purged hangout.
-- Run via pg_cron (see bottom) or SQL Editor with elevated privileges — not exposed to clients.

-- ---------------------------------------------------------------------------
-- hangout_purge_retention_days — single knob for retention window
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hangout_purge_retention_days()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 7;
$$;

-- ---------------------------------------------------------------------------
-- hangout_is_eligible_for_purge — which rows may be removed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hangout_is_eligible_for_purge(p_hangout public.hangouts)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_hangout.status
    WHEN 'completed' THEN
      now() >= p_hangout.updated_at + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'cancelled' THEN
      now() >= p_hangout.updated_at + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'waiting' THEN
      now() >= p_hangout.created_at + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'developing' THEN
      now() >= COALESCE(
        p_hangout.ended_at,
        p_hangout.started_at,
        p_hangout.updated_at,
        p_hangout.created_at
      ) + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'revealing' THEN
      now() >= COALESCE(
        p_hangout.ended_at,
        p_hangout.started_at,
        p_hangout.updated_at,
        p_hangout.created_at
      ) + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'guessing' THEN
      now() >= COALESCE(
        p_hangout.ended_at,
        p_hangout.started_at,
        p_hangout.updated_at,
        p_hangout.created_at
      ) + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    WHEN 'active' THEN
      now() >= COALESCE(
        p_hangout.started_at,
        p_hangout.created_at
      ) + (public.hangout_purge_retention_days() || ' days')::INTERVAL
    ELSE
      false
  END;
$$;

-- ---------------------------------------------------------------------------
-- purge_hangout_storage — remove all objects under {hangout_id}/
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_hangout_storage(p_hangout_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_deleted INTEGER;
  v_prefix TEXT;
BEGIN
  v_prefix := p_hangout_id::TEXT || '/';

  DELETE FROM storage.objects
  WHERE bucket_id = 'hangout-photos'
    AND name LIKE v_prefix || '%';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ---------------------------------------------------------------------------
-- purge_stale_hangouts — batch delete eligible hangouts + their storage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_stale_hangouts(p_batch_size INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_hangout_id UUID;
  v_hangouts_deleted INTEGER := 0;
  v_storage_deleted INTEGER := 0;
  v_batch_storage INTEGER;
  v_limit INTEGER;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_batch_size, 50), 200));

  FOR v_hangout_id IN
    SELECT h.id
    FROM public.hangouts h
    WHERE public.hangout_is_eligible_for_purge(h)
    ORDER BY h.created_at ASC
    LIMIT v_limit
  LOOP
    v_batch_storage := public.purge_hangout_storage(v_hangout_id);
    v_storage_deleted := v_storage_deleted + v_batch_storage;

    DELETE FROM public.hangouts
    WHERE id = v_hangout_id;

    v_hangouts_deleted := v_hangouts_deleted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'hangouts_deleted', v_hangouts_deleted,
    'storage_objects_deleted', v_storage_deleted,
    'retention_days', public.hangout_purge_retention_days()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- cleanup_stale_rpc_rate_buckets — optional hygiene for rate-limit table
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_stale_rpc_rate_buckets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rpc_rate_buckets
  WHERE updated_at < now() - interval '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.hangout_purge_retention_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hangout_purge_retention_days() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.hangout_is_eligible_for_purge(public.hangouts) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hangout_is_eligible_for_purge(public.hangouts) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.purge_hangout_storage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_hangout_storage(UUID) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.purge_stale_hangouts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_stale_hangouts(INTEGER) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.cleanup_stale_rpc_rate_buckets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_rpc_rate_buckets() TO postgres, service_role;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Optional pg_cron (enable "pg_cron" in Supabase Dashboard → Database → Extensions)
-- Then run once in SQL Editor:
--
-- SELECT cron.schedule(
--   'rolli-purge-stale-hangouts',
--   '0 3 * * *',
--   $$ SELECT public.purge_stale_hangouts(50); $$
-- );
--
-- SELECT cron.schedule(
--   'rolli-cleanup-rate-buckets',
--   '0 4 * * 0',
--   $$ SELECT public.cleanup_stale_rpc_rate_buckets(); $$
-- );
-- ---------------------------------------------------------------------------
