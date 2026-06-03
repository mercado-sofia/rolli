-- Rolli: synced 3s reveal countdown before photos are revealed

ALTER TABLE public.hangouts
  ADD COLUMN IF NOT EXISTS reveal_countdown_at TIMESTAMPTZ;

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
    'created_at', p_hangout.created_at,
    'reveal_countdown_at', p_hangout.reveal_countdown_at
  );
$$;

-- ---------------------------------------------------------------------------
-- begin_reveal_countdown — Film Keeper: start synced 3s countdown (developing)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.begin_reveal_countdown(
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
    RAISE EXCEPTION 'Only the Film Keeper can start the reveal countdown';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF v_hangout.status <> 'developing' THEN
    RAISE EXCEPTION 'Countdown can only start while memories are developing';
  END IF;

  IF v_hangout.reveal_countdown_at IS NOT NULL THEN
    RETURN public.build_hangout_json(v_hangout);
  END IF;

  UPDATE public.hangouts
  SET reveal_countdown_at = clock_timestamp()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- start_reveal — Film Keeper: developing → revealing (after countdown)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_reveal(
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
    RAISE EXCEPTION 'Only the Film Keeper can start the reveal';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF v_hangout.status <> 'developing' THEN
    RAISE EXCEPTION 'Reveal can only start while memories are developing';
  END IF;

  IF v_hangout.reveal_countdown_at IS NULL THEN
    RAISE EXCEPTION 'Start the reveal countdown first';
  END IF;

  IF v_hangout.reveal_countdown_at + interval '3 seconds' > clock_timestamp() THEN
    RAISE EXCEPTION 'Reveal countdown is still running';
  END IF;

  UPDATE public.hangouts
  SET
    status = 'revealing',
    reveal_countdown_at = NULL
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

GRANT EXECUTE ON FUNCTION public.begin_reveal_countdown(UUID, UUID) TO anon, authenticated;
