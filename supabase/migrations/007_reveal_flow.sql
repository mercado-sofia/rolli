-- Rolli: reveal flow — start reveal, fetch perspectives, transition to guessing

-- ---------------------------------------------------------------------------
-- Storage: read photos after reveal begins
-- ---------------------------------------------------------------------------

CREATE POLICY hangout_photos_read_after_reveal
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'hangout-photos'
  AND EXISTS (
    SELECT 1
    FROM public.photos ph
    JOIN public.hangouts h ON h.id = ph.hangout_id
    WHERE ph.storage_path = name
      AND h.status IN ('revealing', 'guessing', 'completed')
  )
);

-- ---------------------------------------------------------------------------
-- start_reveal — Film Keeper: developing → revealing
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

  UPDATE public.hangouts
  SET status = 'revealing'
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_reveal_state — perspectives grouped by anonymous nickname
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

  IF v_hangout.status NOT IN ('revealing', 'guessing', 'completed') THEN
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

  RETURN jsonb_build_object(
    'hangout', public.build_hangout_json(v_hangout),
    'perspectives', v_perspectives
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- finish_reveal — Film Keeper: revealing → guessing
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
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.is_film_keeper IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the Film Keeper can continue to guessing';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

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

GRANT EXECUTE ON FUNCTION public.start_reveal(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reveal_state(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_reveal(UUID, UUID) TO anon, authenticated;
