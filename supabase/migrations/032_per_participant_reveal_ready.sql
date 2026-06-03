-- Per-participant ready for guessing: any player can advance when done viewing;
-- hangout moves to guessing only after every active participant opts in.

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS reveal_finished_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS participants_hangout_reveal_ready_idx
  ON public.participants (hangout_id)
  WHERE is_active = true AND reveal_finished_at IS NOT NULL;

UPDATE public.participants p
SET reveal_finished_at = now()
FROM public.hangouts h
WHERE p.hangout_id = h.id
  AND p.is_active
  AND h.status IN ('guessing', 'completed')
  AND p.reveal_finished_at IS NULL;

-- ---------------------------------------------------------------------------
-- build_participant_session_json — include reveal_finished_at
-- ---------------------------------------------------------------------------

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
    'joined_at', p_participant.joined_at,
    'reveal_finished_at', p_participant.reveal_finished_at
  );
$$;

-- ---------------------------------------------------------------------------
-- participant_can_guess
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.participant_can_guess(
  p_hangout public.hangouts,
  p_participant public.participants
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_hangout.status IN ('guessing', 'completed')
    OR (
      p_hangout.status = 'revealing'
      AND p_participant.reveal_finished_at IS NOT NULL
    );
$$;

-- ---------------------------------------------------------------------------
-- maybe_start_guessing_if_all_ready
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maybe_start_guessing_if_all_ready(p_hangout_id UUID)
RETURNS public.hangouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
BEGIN
  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id
  FOR UPDATE;

  IF NOT FOUND OR v_hangout.status <> 'revealing' THEN
    RETURN v_hangout;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.hangout_id = p_hangout_id
      AND p.is_active = true
      AND p.reveal_finished_at IS NULL
  ) THEN
    RETURN v_hangout;
  END IF;

  UPDATE public.hangouts
  SET status = 'guessing'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN v_hangout;
END;
$$;

-- ---------------------------------------------------------------------------
-- mark_ready_for_guessing — any participant: revealing → (self ready, maybe guessing)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_ready_for_guessing(
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'revealing' THEN
    RAISE EXCEPTION 'Hangout is not in the reveal phase';
  END IF;

  UPDATE public.participants
  SET reveal_finished_at = COALESCE(reveal_finished_at, now())
  WHERE id = v_participant.id
  RETURNING * INTO v_participant;

  v_hangout := public.maybe_start_guessing_if_all_ready(p_hangout_id);

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'participant', public.build_participant_session_json(v_participant, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_ready_for_guessing(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_reveal_state — participant + ready_progress
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_reveal_state(
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
  v_perspectives JSONB;
  v_ready_count INTEGER;
  v_total_count INTEGER;
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

  IF v_hangout.status NOT IN ('developing', 'revealing', 'guessing', 'completed') THEN
    RAISE EXCEPTION 'Reveal is not available yet';
  END IF;

  IF v_hangout.status = 'developing' AND v_hangout.reveal_pending_at IS NULL THEN
    RAISE EXCEPTION 'Reveal is not available yet';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'participant_id', p.id,
        'nickname', p.nickname,
        'photos', COALESCE(photo_list.photos, '[]'::jsonb)
      )
      ORDER BY p.joined_at
    ),
    '[]'::jsonb
  ) INTO v_perspectives
  FROM public.participants p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ph.id,
        'storage_path', ph.storage_path,
        'captured_at', ph.captured_at
      )
      ORDER BY ph.captured_at
    ) AS photos
    FROM public.photos ph
    WHERE ph.participant_id = p.id
  ) photo_list ON true
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  SELECT
    COUNT(*) FILTER (WHERE p.reveal_finished_at IS NOT NULL)::INTEGER,
    COUNT(*)::INTEGER
  INTO v_ready_count, v_total_count
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'participant', public.build_participant_session_json(v_participant, true),
    'perspectives', v_perspectives,
    'ready_progress', jsonb_build_object(
      'ready', v_ready_count,
      'total', v_total_count
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- get_guessing_state — allow ready participants during revealing
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

  IF NOT public.participant_can_guess(v_hangout, v_participant) THEN
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

-- ---------------------------------------------------------------------------
-- submit_vote — allow ready participants during revealing
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

  IF NOT public.participant_can_guess(v_hangout, v_voter) THEN
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

  IF v_hangout.status = 'guessing' THEN
    PERFORM public.maybe_complete_guessing_if_ready(p_hangout_id);
  END IF;

  RETURN public.get_guessing_state(p_hangout_id, p_session_token);
END;
$$;
