-- Rolli: hangout participant roster (nicknames only) and Film Keeper kick

-- ---------------------------------------------------------------------------
-- get_hangout_participants — active roster for menu; never exposes real_name
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_hangout_participants(
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
  v_caller public.participants%ROWTYPE;
  v_participants JSONB;
  v_show_guessing BOOLEAN;
  v_active_count INTEGER;
BEGIN
  SELECT * INTO v_caller
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

  IF v_hangout.status NOT IN ('waiting', 'active', 'revealing', 'guessing') THEN
    RAISE EXCEPTION 'Participant list is not available for this hangout phase';
  END IF;

  v_show_guessing := v_hangout.status IN ('guessing', 'revealing');

  SELECT COUNT(*)::INTEGER INTO v_active_count
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'is_film_keeper', (p.id = v_hangout.film_keeper_id),
        'votes_submitted',
          CASE
            WHEN v_show_guessing THEN (
              SELECT COUNT(*)::INTEGER
              FROM public.votes v
              INNER JOIN public.participants t
                ON t.id = v.target_participant_id
                AND t.hangout_id = p_hangout_id
                AND t.is_active = true
                AND t.id <> p.id
              WHERE v.hangout_id = p_hangout_id
                AND v.voter_id = p.id
            )
            ELSE NULL
          END,
        'votes_required',
          CASE
            WHEN v_show_guessing THEN GREATEST(v_active_count - 1, 0)
            ELSE NULL
          END,
        'has_finished_guessing',
          CASE
            WHEN NOT v_show_guessing THEN NULL
            WHEN v_active_count <= 1 THEN true
            ELSE (
              SELECT COUNT(*)::INTEGER
              FROM public.votes v
              INNER JOIN public.participants t
                ON t.id = v.target_participant_id
                AND t.hangout_id = p_hangout_id
                AND t.is_active = true
                AND t.id <> p.id
              WHERE v.hangout_id = p_hangout_id
                AND v.voter_id = p.id
            ) >= GREATEST(v_active_count - 1, 0)
          END
      )
      ORDER BY p.joined_at, p.id
    ),
    '[]'::jsonb
  ) INTO v_participants
  FROM public.participants p
  WHERE p.hangout_id = p_hangout_id
    AND p.is_active = true;

  RETURN jsonb_build_object(
    'participants', v_participants,
    'hangout', public.build_hangout_json(v_hangout)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- remove_participant_by_keeper — deactivate a guest (same effect as leave)
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
    is_film_keeper = false
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

GRANT EXECUTE ON FUNCTION public.get_hangout_participants(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_participant_by_keeper(UUID, UUID, UUID) TO anon, authenticated;
