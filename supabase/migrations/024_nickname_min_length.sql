-- Allow 2-character nicknames (single-character nicknames remain invalid).

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
BEGIN
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

  IF length(v_nickname) < 2 THEN
    RAISE EXCEPTION 'Nickname must be at least 2 characters';
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
