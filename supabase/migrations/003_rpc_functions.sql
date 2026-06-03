-- Rolli: RPC functions (callable with Supabase anon key)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hangout_status_to_text(p_status public.hangout_status)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.build_hangout_json(p_hangout public.hangouts)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_hangout.id,
    'slug', p_hangout.slug,
    'title', p_hangout.title,
    'status', public.hangout_status_to_text(p_hangout.status),
    'participant_count', p_hangout.participant_count,
    'film_keeper_id', p_hangout.film_keeper_id,
    'started_at', p_hangout.started_at,
    'ended_at', p_hangout.ended_at,
    'created_at', p_hangout.created_at
  );
$$;

CREATE OR REPLACE FUNCTION public.build_participant_session_json(
  p_participant public.participants,
  p_include_real_name BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_participant.id,
    'hangout_id', p_participant.hangout_id,
    'nickname', p_participant.nickname,
    'real_name', CASE WHEN p_include_real_name THEN p_participant.real_name ELSE NULL END,
    'session_token', p_participant.session_token,
    'is_film_keeper', p_participant.is_film_keeper,
    'photos_taken', p_participant.photos_taken,
    'joined_at', p_participant.joined_at
  );
$$;

-- ---------------------------------------------------------------------------
-- create_hangout_with_keeper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_hangout_with_keeper(
  p_slug TEXT,
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
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
BEGIN
  IF length(trim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Hangout title must be at least 3 characters';
  END IF;

  IF length(trim(p_nickname)) < 3 THEN
    RAISE EXCEPTION 'Nickname must be at least 3 characters';
  END IF;

  IF length(trim(p_real_name)) < 2 THEN
    RAISE EXCEPTION 'Real name must be at least 2 characters';
  END IF;

  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid hangout slug';
  END IF;

  INSERT INTO public.hangouts (slug, title, status)
  VALUES (p_slug, trim(p_title), 'waiting')
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
    RAISE EXCEPTION 'This hangout link is already taken. Try a different title.';
END;
$$;

-- ---------------------------------------------------------------------------
-- join_hangout
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
  v_max_participants CONSTANT INTEGER := 10;
BEGIN
  IF length(trim(p_nickname)) < 3 THEN
    RAISE EXCEPTION 'Nickname must be at least 3 characters';
  END IF;

  IF length(trim(p_real_name)) < 2 THEN
    RAISE EXCEPTION 'Real name must be at least 2 characters';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'waiting' THEN
    RAISE EXCEPTION 'This hangout has already started';
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
    trim(p_nickname),
    trim(p_real_name),
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

-- ---------------------------------------------------------------------------
-- get_hangout_public — waiting room / lobby
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

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- start_hangout — Film Keeper only, 2–8 participants
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_hangout(
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
  v_min CONSTANT INTEGER := 2;
  v_max CONSTANT INTEGER := 8;
BEGIN
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.is_film_keeper IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the Film Keeper can start the hangout';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF v_hangout.status <> 'waiting' THEN
    RAISE EXCEPTION 'Hangout has already started';
  END IF;

  IF v_hangout.participant_count < v_min THEN
    RAISE EXCEPTION 'Need at least % participants to start', v_min;
  END IF;

  IF v_hangout.participant_count > v_max THEN
    RAISE EXCEPTION 'Cannot start with more than % participants', v_max;
  END IF;

  UPDATE public.hangouts
  SET status = 'active', started_at = now()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- end_hangout — Film Keeper ends session ("Develop Memories")
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.end_hangout(
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

  IF NOT FOUND OR v_participant.is_film_keeper IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the Film Keeper can end the hangout';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF v_hangout.status NOT IN ('active', 'waiting') THEN
    RAISE EXCEPTION 'Hangout cannot be ended from its current state';
  END IF;

  UPDATE public.hangouts
  SET status = 'developing', ended_at = now()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.create_hangout_with_keeper(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_hangout(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hangout_public(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_hangout(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_hangout(UUID, UUID) TO anon, authenticated;
