-- Rolli: harden start + guessing rules
-- - Align start_hangout with room capacity (2-10 participants)
-- - Enforce one unique real-name guess per voter
-- - Prevent finishing guessing before all active participants submit every vote

-- ---------------------------------------------------------------------------
-- start_hangout — Film Keeper only, 2–10 participants
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
-- submit_vote — prevent duplicate guessed real names per voter
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_vote(
  p_hangout_id UUID,
  p_session_token UUID,
  p_target_participant_id UUID,
  p_guessed_real_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_voter public.participants%ROWTYPE;
  v_target public.participants%ROWTYPE;
  v_guess TEXT;
  v_name_match BOOLEAN;
  v_duplicate_assignment BOOLEAN;
BEGIN
  IF length(trim(p_guessed_real_name)) < 2 THEN
    RAISE EXCEPTION 'Guess must be at least 2 characters';
  END IF;

  v_guess := trim(p_guessed_real_name);

  SELECT * INTO v_voter
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

  IF v_hangout.status <> 'guessing' THEN
    RAISE EXCEPTION 'Guessing is not open';
  END IF;

  SELECT * INTO v_target
  FROM public.participants
  WHERE id = p_target_participant_id
    AND hangout_id = p_hangout_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target participant not found';
  END IF;

  IF v_target.id = v_voter.id THEN
    RAISE EXCEPTION 'You cannot guess your own nickname';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.hangout_id = p_hangout_id
      AND p.is_active = true
      AND lower(trim(p.real_name)) = lower(v_guess)
  ) INTO v_name_match;

  IF NOT v_name_match THEN
    RAISE EXCEPTION 'That name is not in this hangout';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.votes v
    WHERE v.hangout_id = p_hangout_id
      AND v.voter_id = v_voter.id
      AND v.target_participant_id <> v_target.id
      AND lower(trim(v.guessed_real_name)) = lower(v_guess)
  ) INTO v_duplicate_assignment;

  IF v_duplicate_assignment THEN
    RAISE EXCEPTION 'Each real name can only be assigned once';
  END IF;

  INSERT INTO public.votes (
    hangout_id,
    voter_id,
    target_participant_id,
    guessed_real_name
  )
  VALUES (
    p_hangout_id,
    v_voter.id,
    v_target.id,
    v_guess
  )
  ON CONFLICT (voter_id, target_participant_id)
  DO UPDATE SET
    guessed_real_name = EXCLUDED.guessed_real_name,
    created_at = now();

  RETURN public.get_guessing_state(p_hangout_id, p_session_token);
END;
$$;

-- ---------------------------------------------------------------------------
-- finish_guessing — require complete votes from all active participants
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
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.is_film_keeper IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the Film Keeper can finish guessing';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

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

