-- Remove synced reveal countdown; countdown runs client-side only.

DROP FUNCTION IF EXISTS public.begin_reveal_countdown(UUID, UUID);

ALTER TABLE public.hangouts
  DROP COLUMN IF EXISTS reveal_countdown_at;

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
    'created_at', p_hangout.created_at
  );
$$;

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

CREATE OR REPLACE FUNCTION public.can_read_hangout_photo(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.photos ph
    JOIN public.hangouts h ON h.id = ph.hangout_id
    WHERE ph.storage_path = p_path
      AND h.status IN ('revealing', 'guessing', 'completed')
  );
$$;
