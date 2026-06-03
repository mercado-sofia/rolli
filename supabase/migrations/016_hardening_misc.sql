-- Rolli: end_hangout restriction, upload slot cleanup

-- ---------------------------------------------------------------------------
-- end_hangout — only from active session (not waiting)
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
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND OR v_participant.is_film_keeper IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the Film Keeper can end the hangout';
  END IF;

  SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id FOR UPDATE;

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
-- cleanup_expired_photo_upload_slots — delete unused expired slots
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_photo_upload_slots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.photo_upload_slots
  WHERE used_at IS NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_photo_upload_slots() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
