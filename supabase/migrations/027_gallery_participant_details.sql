-- Include participant identity in gallery payload (hangout is completed; names are revealed).

CREATE OR REPLACE FUNCTION public.get_gallery(
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

  IF v_hangout.status <> 'completed' THEN
    RAISE EXCEPTION 'Gallery is available after the hangout is completed';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'participant_id', p.id,
        'nickname', p.nickname,
        'real_name', p.real_name,
        'is_film_keeper', p.is_film_keeper,
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
