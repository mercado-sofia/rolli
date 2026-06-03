-- Rolli: guessing phase — private votes and results

-- ---------------------------------------------------------------------------
-- get_guessing_state
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_guessing_state(
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
  v_targets JSONB;
  v_real_names JSONB;
  v_my_votes JSONB;
  v_votes_required INTEGER;
  v_votes_submitted INTEGER;
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

  IF v_hangout.status NOT IN ('guessing', 'completed') THEN
    RAISE EXCEPTION 'Guessing is not available yet';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'participant_id', p.id,
        'nickname', p.nickname
      )
      ORDER BY p.joined_at
    ),
    '[]'::jsonb
  ) INTO v_targets
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true
    AND p.id <> v_participant.id;

  SELECT COALESCE(
    jsonb_agg(real_name ORDER BY real_name),
    '[]'::jsonb
  ) INTO v_real_names
  FROM (
    SELECT DISTINCT trim(p.real_name) AS real_name
    FROM public.participants p
    WHERE p.hangout_id = p_hangout_id
      AND p.is_active = true
  ) names;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'target_participant_id', v.target_participant_id,
        'guessed_real_name', v.guessed_real_name
      )
    ),
    '[]'::jsonb
  ) INTO v_my_votes
  FROM public.votes v
  WHERE v.hangout_id = p_hangout_id
    AND v.voter_id = v_participant.id;

  SELECT COUNT(*)::INTEGER INTO v_votes_required
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true
    AND p.id <> v_participant.id;

  SELECT COUNT(*)::INTEGER INTO v_votes_submitted
  FROM public.votes v
  WHERE v.hangout_id = p_hangout_id
    AND v.voter_id = v_participant.id;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'voter_id', v_participant.id,
    'targets', v_targets,
    'real_name_options', v_real_names,
    'my_votes', v_my_votes,
    'votes_required', v_votes_required,
    'votes_submitted', v_votes_submitted
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- submit_vote
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
-- finish_guessing — Film Keeper: guessing → completed
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

  UPDATE public.hangouts
  SET status = 'completed'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_guessing_results — after hangout is completed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_guessing_results(
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
  v_revealed JSONB;
  v_correct INTEGER;
  v_total INTEGER;
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

  IF v_hangout.status <> 'completed' THEN
    RAISE EXCEPTION 'Results are not available yet';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'participant_id', p.id,
        'nickname', p.nickname,
        'real_name', p.real_name
      )
      ORDER BY p.joined_at
    ),
    '[]'::jsonb
  ) INTO v_revealed
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  SELECT COUNT(*)::INTEGER INTO v_total
  FROM public.votes v
  WHERE v.hangout_id = p_hangout_id
    AND v.voter_id = v_participant.id;

  SELECT COUNT(*)::INTEGER INTO v_correct
  FROM public.votes v
  JOIN public.participants target ON target.id = v.target_participant_id
  WHERE v.hangout_id = p_hangout_id
    AND v.voter_id = v_participant.id
    AND lower(trim(v.guessed_real_name)) = lower(trim(target.real_name));

  RETURN jsonb_build_object(
    'revealed', v_revealed,
    'my_score', jsonb_build_object(
      'correct', v_correct,
      'total', v_total
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guessing_state(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_vote(UUID, UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_guessing(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guessing_results(UUID, UUID) TO anon, authenticated;
