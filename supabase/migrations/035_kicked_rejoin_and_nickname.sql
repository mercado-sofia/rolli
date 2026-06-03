-- Rolli: allow kicked guests to join again as a new participant (same nickname OK when inactive)

ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_nickname_per_hangout;

CREATE UNIQUE INDEX IF NOT EXISTS participants_active_nickname_per_hangout
  ON public.participants (hangout_id, nickname)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- join_hangout — new row after keeper kick; active nicknames only must be unique
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

  IF v_hangout.status NOT IN ('waiting', 'active', 'revealing', 'guessing') THEN
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

  IF FOUND
    AND v_existing.is_active IS FALSE
    AND v_existing.removed_by_keeper_at IS NULL
  THEN
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
