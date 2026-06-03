-- Rolli: auto-generate unique invitation slugs (title can repeat)

CREATE OR REPLACE FUNCTION public.generate_hangout_slug()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    -- 12 lowercase hex chars, e.g. a3f9c2b1e8d4 (built-in UUID, no pgcrypto)
    v_slug := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    IF NOT EXISTS (SELECT 1 FROM public.hangouts WHERE slug = v_slug) THEN
      RETURN v_slug;
    END IF;

    v_attempt := v_attempt + 1;
    IF v_attempt > 20 THEN
      RAISE EXCEPTION 'Could not create hangout. Please try again.';
    END IF;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.create_hangout_with_keeper(TEXT, TEXT, TEXT, TEXT);

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

  IF length(trim(p_nickname)) < 3 THEN
    RAISE EXCEPTION 'Nickname must be at least 3 characters';
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

GRANT EXECUTE ON FUNCTION public.generate_hangout_slug() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_hangout_with_keeper(TEXT, TEXT, TEXT) TO anon, authenticated;
