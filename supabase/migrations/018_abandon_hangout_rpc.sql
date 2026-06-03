-- Rolli: Film Keeper can cancel a hangout before it starts

CREATE OR REPLACE FUNCTION public.abandon_hangout(
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
    RAISE EXCEPTION 'Only the Film Keeper can abandon the hangout';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'waiting' THEN
    RAISE EXCEPTION 'Hangout can only be abandoned before it starts';
  END IF;

  UPDATE public.hangouts
  SET
    status = 'cancelled',
    ended_at = now()
  WHERE id = p_hangout_id
  RETURNING * INTO v_hangout;

  RETURN public.build_hangout_json(v_hangout);
END;
$$;

GRANT EXECUTE ON FUNCTION public.abandon_hangout(UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
