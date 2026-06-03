-- Rolli: distinguish keeper kick from voluntary leave; session status for kicked UI

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS removed_by_keeper_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- get_participant_session_status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_participant_session_status(
  p_hangout_id UUID,
  p_session_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_participant public.participants%ROWTYPE;
BEGIN
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  RETURN jsonb_build_object(
    'is_active', v_participant.is_active,
    'removed_by_keeper', v_participant.removed_by_keeper_at IS NOT NULL
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- remove_participant_by_keeper — mark removed_by_keeper_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remove_participant_by_keeper(
  p_hangout_id UUID,
  p_session_token UUID,
  p_target_participant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_keeper public.participants%ROWTYPE;
  v_target public.participants%ROWTYPE;
BEGIN
  SELECT * INTO v_keeper
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

  IF v_keeper.id IS DISTINCT FROM v_hangout.film_keeper_id THEN
    RAISE EXCEPTION 'Only the Film Keeper can remove participants';
  END IF;

  IF v_hangout.status NOT IN ('waiting', 'active', 'revealing', 'guessing') THEN
    RAISE EXCEPTION 'Participants cannot be removed in this hangout phase';
  END IF;

  IF p_target_participant_id = v_keeper.id THEN
    RAISE EXCEPTION 'You cannot remove yourself from the hangout';
  END IF;

  SELECT * INTO v_target
  FROM public.participants
  WHERE id = p_target_participant_id
    AND hangout_id = p_hangout_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found or already removed';
  END IF;

  IF v_target.id = v_hangout.film_keeper_id THEN
    PERFORM public.transfer_film_keeper(p_hangout_id, v_target.id);
  END IF;

  UPDATE public.participants
  SET
    is_active = false,
    left_at = now(),
    is_film_keeper = false,
    removed_by_keeper_at = now()
  WHERE id = v_target.id;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id;

  IF v_hangout.status = 'revealing' THEN
    v_hangout := public.maybe_start_guessing_if_all_ready(p_hangout_id);
  ELSIF v_hangout.status = 'guessing' THEN
    v_hangout := public.maybe_complete_guessing_if_ready(p_hangout_id);
  END IF;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- rejoin_hangout — block rejoin after keeper kick
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

  IF v_participant.removed_by_keeper_at IS NOT NULL THEN
    RAISE EXCEPTION 'You were removed from this hangout by the Film Keeper';
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
    left_at = NULL,
    removed_by_keeper_at = NULL
  WHERE id = v_participant.id
  RETURNING * INTO v_participant;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout.id;

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'participant', public.build_participant_session_json(v_participant, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_participant_session_status(UUID, UUID) TO anon, authenticated;
