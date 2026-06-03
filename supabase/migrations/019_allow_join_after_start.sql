-- Rolli: allow guests to join (or rejoin) while a hangout is in progress

-- ---------------------------------------------------------------------------
-- rejoin_hangout
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rejoin_hangout(
  p_slug TEXT,
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
  v_max_participants CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This hangout is no longer accepting guests';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = v_hangout.id
    AND session_token = p_session_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No previous session found for this hangout';
  END IF;

  IF v_participant.is_active IS TRUE THEN
    SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout.id;
    RETURN jsonb_build_object(
      'hangout', public.build_hangout_json(v_hangout),
      'participant', public.build_participant_session_json(v_participant, true)
    );
  END IF;

  IF v_participant.left_at IS NULL THEN
    RAISE EXCEPTION 'Cannot rejoin this session';
  END IF;

  IF v_hangout.participant_count >= v_max_participants THEN
    RAISE EXCEPTION 'This hangout is full (max % participants)', v_max_participants;
  END IF;

  UPDATE public.participants
  SET
    is_active = true,
    left_at = NULL
  WHERE id = v_participant.id
  RETURNING * INTO v_participant;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout.id;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'participant', public.build_participant_session_json(v_participant, true)
  );
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
  v_existing public.participants%ROWTYPE;
  v_max_participants CONSTANT INTEGER := 10;
  v_nickname TEXT;
  v_real_name TEXT;
BEGIN
  v_nickname := trim(p_nickname);
  v_real_name := trim(p_real_name);

  IF length(v_nickname) < 3 THEN
    RAISE EXCEPTION 'Nickname must be at least 3 characters';
  END IF;

  IF length(v_real_name) < 2 THEN
    RAISE EXCEPTION 'Real name must be at least 2 characters';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This hangout is no longer accepting guests';
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
    IF v_hangout.participant_count >= v_max_participants THEN
      RAISE EXCEPTION 'This hangout is full (max % participants)', v_max_participants;
    END IF;

    UPDATE public.participants
    SET
      real_name = v_real_name,
      is_active = true,
      left_at = NULL,
      session_token = gen_random_uuid()
    WHERE id = v_existing.id
    RETURNING * INTO v_participant;

    SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout.id;

    RETURN jsonb_build_object(
      'hangout', public.build_hangout_json(v_hangout),
      'participant', public.build_participant_session_json(v_participant, true)
    );
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

NOTIFY pgrst, 'reload schema';
