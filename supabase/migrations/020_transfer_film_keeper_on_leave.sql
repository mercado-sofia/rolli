-- Rolli: transfer Film Keeper on leave; harden keeper checks on film_keeper_id

-- ---------------------------------------------------------------------------
-- transfer_film_keeper — assign host to next active participant
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transfer_film_keeper(
  p_hangout_id UUID,
  p_from_participant_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_successor public.participants%ROWTYPE;
BEGIN
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_hangout.film_keeper_id IS DISTINCT FROM p_from_participant_id THEN
    RETURN v_hangout.film_keeper_id;
  END IF;

  SELECT * INTO v_successor
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND is_active = true
    AND id <> p_from_participant_id
  ORDER BY joined_at ASC, id ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.participants
  SET is_film_keeper = false
  WHERE id = p_from_participant_id;

  UPDATE public.participants
  SET is_film_keeper = true
  WHERE id = v_successor.id;

  UPDATE public.hangouts
  SET film_keeper_id = v_successor.id
  WHERE id = p_hangout_id;

  RETURN v_successor.id;
END;
$$;

-- ---------------------------------------------------------------------------
-- leave_hangout — transfer keeper before deactivating when others remain
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.leave_hangout(
  p_hangout_id UUID,
  p_session_token UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_other_active_count INTEGER;
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

  IF v_participant.id = v_hangout.film_keeper_id THEN
    SELECT COUNT(*)::INTEGER INTO v_other_active_count
    FROM public.participants
    WHERE hangout_id = p_hangout_id
      AND is_active = true
      AND id <> v_participant.id;

    IF v_other_active_count = 0 AND v_hangout.status = 'waiting' THEN
      RAISE EXCEPTION 'The Film Keeper cannot leave while the hangout is waiting. Start or abandon the hangout first.';
    END IF;

    IF v_other_active_count > 0 THEN
      PERFORM public.transfer_film_keeper(p_hangout_id, v_participant.id);
    END IF;
  END IF;

  UPDATE public.participants
  SET
    is_active = false,
    left_at = now(),
    is_film_keeper = false
  WHERE id = v_participant.id;
END;
$$;

-- ---------------------------------------------------------------------------
-- start_hangout — Film Keeper only (film_keeper_id)
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
  v_max CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can start the hangout';
  END IF;

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
-- end_hangout — Film Keeper only (film_keeper_id)
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
  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can end the hangout';
  END IF;

  IF v_hangout.status <> 'active' THEN
    RAISE EXCEPTION 'Hangout can only be ended during an active session';
  END IF;

  UPDATE public.hangouts
  SET status = 'developing', ended_at = now()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- start_reveal — Film Keeper only (film_keeper_id)
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
  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can start the reveal';
  END IF;

  IF v_hangout.status <> 'developing' THEN
    RAISE EXCEPTION 'Reveal can only start while memories are developing';
  END IF;

  UPDATE public.hangouts
  SET status = 'revealing'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- finish_reveal — Film Keeper only (film_keeper_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finish_reveal(
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
  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can continue to guessing';
  END IF;

  IF v_hangout.status <> 'revealing' THEN
    RAISE EXCEPTION 'Hangout is not in the reveal phase';
  END IF;

  UPDATE public.hangouts
  SET status = 'guessing'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- finish_guessing — Film Keeper only (film_keeper_id)
-- ---------------------------------------------------------------------------

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
  v_active_count INTEGER;
  v_expected_votes INTEGER;
  v_actual_votes INTEGER;
BEGIN
  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can finish guessing';
  END IF;

  IF v_hangout.status <> 'guessing' THEN
    RAISE EXCEPTION 'Hangout is not in the guessing phase';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_active_count
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  v_expected_votes := v_active_count * GREATEST(v_active_count - 1, 0);

  SELECT COUNT(*)::INTEGER INTO v_actual_votes
  FROM public.votes v
  WHERE v.hangout_id = p_hangout_id;

  IF v_actual_votes < v_expected_votes THEN
    RAISE EXCEPTION 'All participants must finish guessing first';
  END IF;

  UPDATE public.hangouts
  SET status = 'completed'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- abandon_hangout — Film Keeper only (film_keeper_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.abandon_hangout(
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
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can abandon the hangout';
  END IF;

  IF v_hangout.status <> 'waiting' THEN
    RAISE EXCEPTION 'Hangout can only be abandoned before it starts';
  END IF;

  UPDATE public.hangouts
  SET
    status = 'cancelled',
    ended_at = now()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_film_keeper(UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
