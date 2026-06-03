-- Rolli: security hardening — RPC lockdown, reveal photo gate, guessing fix,
-- join reactivation block, rate limiting, and missing grants.

-- ---------------------------------------------------------------------------
-- 1.1 Revoke public execute on transfer_film_keeper (internal-only via leave)
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.transfer_film_keeper(UUID, UUID) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1.2 Gate photo reads during developing until reveal_pending_at is set
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_reveal_state(
  p_hangout_id UUID,
  p_session_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_perspectives JSONB;
BEGIN
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status NOT IN ('developing', 'revealing', 'guessing', 'completed') THEN
    RAISE EXCEPTION 'Reveal is not available yet';
  END IF;

  IF v_hangout.status = 'developing' AND v_hangout.reveal_pending_at IS NULL THEN
    RAISE EXCEPTION 'Reveal is not available yet';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'participant_id', p.id,
        'nickname', p.nickname,
        'photos', COALESCE(photo_list.photos, '[]'::jsonb)
      )
      ORDER BY p.joined_at
    ),
    '[]'::jsonb
  ) INTO v_perspectives
  FROM public.participants p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ph.id,
        'storage_path', ph.storage_path,
        'captured_at', ph.captured_at
      )
      ORDER BY ph.captured_at
    ) AS photos
    FROM public.photos ph
    WHERE ph.participant_id = p.id
  ) photo_list ON true
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'perspectives', v_perspectives
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_hangout_photo(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.photos ph
    JOIN public.hangouts h ON h.id = ph.hangout_id
    WHERE ph.storage_path = p_path
      AND (
        h.status IN ('revealing', 'guessing', 'completed')
        OR (h.status = 'developing' AND h.reveal_pending_at IS NOT NULL)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 1.3 Grant signal_reveal_pending
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.signal_reveal_pending(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1.4 Fix guessing completion — every active voter must finish all guesses
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.all_active_participants_finished_guessing(
  p_hangout_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.hangout_id = p_hangout_id
      AND p.is_active = true
      AND (
        SELECT COUNT(*)::INTEGER
        FROM public.votes v
        INNER JOIN public.participants t
          ON t.id = v.target_participant_id
          AND t.hangout_id = p_hangout_id
          AND t.is_active = true
          AND t.id <> p.id
        WHERE v.hangout_id = p_hangout_id
          AND v.voter_id = p.id
      ) < GREATEST(
        (
          SELECT COUNT(*)::INTEGER
          FROM public.participants ap
          WHERE ap.hangout_id = p_hangout_id
            AND ap.is_active = true
        ) - 1,
        0
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.maybe_complete_guessing_if_ready(p_hangout_id UUID)
RETURNS public.hangouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
BEGIN
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id
  FOR UPDATE;

  IF NOT FOUND OR v_hangout.status <> 'guessing' THEN
    RETURN v_hangout;
  END IF;

  IF NOT public.all_active_participants_finished_guessing(p_hangout_id) THEN
    RETURN v_hangout;
  END IF;

  UPDATE public.hangouts
  SET status = 'completed'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN v_hangout;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_guessing(
  p_hangout_id UUID,
  p_session_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
BEGIN
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status = 'completed' THEN
    RETURN public.build_hangout_json(v_hangout);
  END IF;

  IF v_hangout.status <> 'guessing' THEN
    RAISE EXCEPTION 'Hangout is not in the guessing phase';
  END IF;

  v_hangout := public.maybe_complete_guessing_if_ready(p_hangout_id);

  IF v_hangout.status <> 'completed' THEN
    RAISE EXCEPTION 'All participants must finish guessing first';
  END IF;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1.6 RPC rate limiting (infrastructure — before RPCs that call it)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rpc_rate_buckets (
  bucket_key TEXT PRIMARY KEY,
  request_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rpc_rate_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assert_rate_limit(
  p_bucket_key TEXT,
  p_max_requests INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.rpc_rate_buckets AS b (bucket_key, request_count, updated_at)
  VALUES (p_bucket_key, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    request_count = b.request_count + 1,
    updated_at = now()
  RETURNING b.request_count INTO v_count;

  IF v_count > p_max_requests THEN
    RAISE EXCEPTION 'Too many requests. Please wait a moment and try again.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1.5 Block inactive-nickname reactivation via join_hangout
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.join_hangout(
  p_slug TEXT,
  p_nickname TEXT,
  p_real_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_existing public.participants%ROWTYPE;
  v_max_participants CONSTANT INTEGER := 10;
  v_nickname TEXT;
  v_real_name TEXT;
  v_rate_bucket TEXT;
BEGIN
  v_nickname := trim(p_nickname);
  v_real_name := trim(p_real_name);

  IF length(v_nickname) < 2 THEN
    RAISE EXCEPTION 'Nickname must be at least 2 characters';
  END IF;

  IF length(v_real_name) < 2 THEN
    RAISE EXCEPTION 'Real name must be at least 2 characters';
  END IF;

  v_rate_bucket := 'join:' || p_slug || ':' || to_char(now(), 'YYYYMMDDHH24MI');
  PERFORM public.assert_rate_limit(v_rate_bucket, 20);

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status NOT IN ('waiting', 'active') THEN
    RAISE EXCEPTION 'This hangout has ended. New guests cannot join.';
  END IF;

  SELECT * INTO v_existing
  FROM public.participants
  WHERE hangout_id = v_hangout.id
    AND nickname = v_nickname;

  IF FOUND AND v_existing.is_active IS TRUE THEN
    RAISE EXCEPTION 'That nickname is already taken in this hangout';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.hangout_id = v_hangout.id
      AND p.is_active = true
      AND lower(trim(p.real_name)) = lower(v_real_name)
  ) THEN
    RAISE EXCEPTION 'Someone in this hangout is already using that real name';
  END IF;

  IF FOUND AND v_existing.is_active IS FALSE THEN
    RAISE EXCEPTION 'That nickname was used before. Choose a different nickname or rejoin with your saved session.';
  END IF;

  IF v_hangout.participant_count >= v_max_participants THEN
    RAISE EXCEPTION 'This hangout is full (max % participants)', v_max_participants;
  END IF;

  INSERT INTO public.participants (
    hangout_id,
    nickname,
    real_name,
    is_film_keeper,
    is_active
  )
  VALUES (
    v_hangout.id,
    v_nickname,
    v_real_name,
    false,
    true
  )
  RETURNING * INTO v_participant;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout.id;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'participant', public.build_participant_session_json(v_participant, true)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That nickname is already taken in this hangout';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_hangout_with_keeper(
  p_title TEXT,
  p_nickname TEXT,
  p_real_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_attempt INTEGER := 0;
  v_rate_bucket TEXT;
BEGIN
  v_rate_bucket := 'create:' || to_char(now(), 'YYYYMMDDHH24MI');
  PERFORM public.assert_rate_limit(v_rate_bucket, 10);

  IF length(trim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Hangout title must be at least 3 characters';
  END IF;

  IF length(trim(p_nickname)) < 2 THEN
    RAISE EXCEPTION 'Nickname must be at least 2 characters';
  END IF;

  IF length(trim(p_real_name)) < 2 THEN
    RAISE EXCEPTION 'Real name must be at least 2 characters';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      RAISE EXCEPTION 'Could not create hangout. Please try again.';
    END IF;

    v_slug := public.generate_hangout_slug();

    BEGIN
      INSERT INTO public.hangouts (slug, title, status)
      VALUES (v_slug, trim(p_title), 'waiting')
      RETURNING * INTO v_hangout;

      INSERT INTO public.participants (
        hangout_id,
        nickname,
        real_name,
        is_film_keeper,
        is_active
      )
      VALUES (
        v_hangout.id,
        trim(p_nickname),
        trim(p_real_name),
        true,
        true
      )
      RETURNING * INTO v_participant;

      UPDATE public.hangouts
      SET film_keeper_id = v_participant.id
      WHERE id = v_hangout.id
      RETURNING * INTO v_hangout;

      RETURN jsonb_build_object(
        'hangout', public.build_hangout_json(v_hangout),
        'participant', public.build_participant_session_json(v_participant, true)
      );
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_photo_upload(
  p_hangout_id UUID,
  p_session_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_photo_id UUID;
  v_storage_path TEXT;
  v_max_photos CONSTANT INTEGER := 10;
  v_rate_bucket TEXT;
BEGIN
  v_rate_bucket := 'upload:' || p_session_token::TEXT || ':' || to_char(now(), 'YYYYMMDDHH24MI');
  PERFORM public.assert_rate_limit(v_rate_bucket, 15);

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'active' THEN
    RAISE EXCEPTION 'Hangout is not active';
  END IF;

  IF v_participant.photos_taken >= v_max_photos THEN
    RAISE EXCEPTION 'Photo limit reached (max % per person)', v_max_photos;
  END IF;

  v_photo_id := gen_random_uuid();
  v_storage_path := p_hangout_id::TEXT || '/' || v_participant.id::TEXT || '/' || v_photo_id::TEXT || '.jpg';

  INSERT INTO public.photo_upload_slots (
    storage_path,
    hangout_id,
    participant_id
  )
  VALUES (
    v_storage_path,
    p_hangout_id,
    v_participant.id
  );

  RETURN jsonb_build_object(
    'storage_path', v_storage_path,
    'content_type', 'image/jpeg'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hangout_public(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_rate_bucket TEXT;
BEGIN
  v_rate_bucket := 'poll:' || p_slug || ':' || to_char(now(), 'YYYYMMDDHH24MI');
  PERFORM public.assert_rate_limit(v_rate_bucket, 90);

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

-- Revoke public execute on maintenance RPCs
REVOKE EXECUTE ON FUNCTION public.auto_end_hangout_if_expired(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_end_expired_hangouts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_photo_upload_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_hangout_slug() FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
