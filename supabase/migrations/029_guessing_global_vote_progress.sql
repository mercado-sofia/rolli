-- Expose hangout-wide vote progress so clients don't finish early after one player guesses.

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
  v_active_count INTEGER;
  v_total_votes_required INTEGER;
  v_total_votes_submitted INTEGER;
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

  SELECT COUNT(*)::INTEGER INTO v_active_count
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  v_total_votes_required := v_active_count * GREATEST(v_active_count - 1, 0);

  SELECT COUNT(*)::INTEGER INTO v_total_votes_submitted
  FROM public.votes v
  WHERE v.hangout_id = p_hangout_id;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'voter_id', v_participant.id,
    'targets', v_targets,
    'real_name_options', v_real_names,
    'my_votes', v_my_votes,
    'votes_required', v_votes_required,
    'votes_submitted', v_votes_submitted,
    'total_votes_required', v_total_votes_required,
    'total_votes_submitted', v_total_votes_submitted,
    'all_participants_voted', v_total_votes_submitted >= v_total_votes_required
  );
END;
$$;