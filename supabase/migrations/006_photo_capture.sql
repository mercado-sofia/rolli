-- Rolli: photo capture — upload slots, RPCs, and storage policies

-- ---------------------------------------------------------------------------
-- Upload slots (authorize anon storage INSERT without Supabase Auth)
-- ---------------------------------------------------------------------------

CREATE TABLE public.photo_upload_slots (
  storage_path TEXT PRIMARY KEY,
  hangout_id UUID NOT NULL REFERENCES public.hangouts (id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMPTZ
);

CREATE INDEX photo_upload_slots_participant_idx
  ON public.photo_upload_slots (participant_id);

ALTER TABLE public.photo_upload_slots ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- prepare_photo_upload — reserve a storage path for this participant
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepare_photo_upload(
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
  v_photo_id UUID;
  v_storage_path TEXT;
  v_max_photos CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'active' THEN
    RAISE EXCEPTION 'Hangout is not active';
  END IF;

  IF v_participant.photos_taken >= v_max_photos THEN
    RAISE EXCEPTION 'Photo limit reached (max % per person)', v_max_photos;
  END IF;

  v_photo_id := gen_random_uuid();
  v_storage_path := p_hangout_id::TEXT || '/' || v_participant.id::TEXT || '/' || v_photo_id::TEXT || '.jpg';

  INSERT INTO public.photo_upload_slots (
    storage_path,
    hangout_id,
    participant_id
  )
  VALUES (
    v_storage_path,
    p_hangout_id,
    v_participant.id
  );

  RETURN jsonb_build_object(
    'storage_path', v_storage_path,
    'content_type', 'image/jpeg'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- capture_photo — register uploaded file and bump photos_taken
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.capture_photo(
  p_hangout_id UUID,
  p_session_token UUID,
  p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hangout public.hangouts%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_slot public.photo_upload_slots%ROWTYPE;
  v_photo public.photos%ROWTYPE;
  v_max_photos CONSTANT INTEGER := 10;
BEGIN
  IF p_storage_path IS NULL OR trim(p_storage_path) = '' THEN
    RAISE EXCEPTION 'Storage path is required';
  END IF;

  SELECT * INTO v_participant
  FROM public.participants
  WHERE hangout_id = p_hangout_id
    AND session_token = p_session_token
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_hangout
  FROM public.hangouts
  WHERE id = p_hangout_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hangout not found';
  END IF;

  IF v_hangout.status <> 'active' THEN
    RAISE EXCEPTION 'Hangout is not active';
  END IF;

  IF v_participant.photos_taken >= v_max_photos THEN
    RAISE EXCEPTION 'Photo limit reached (max % per person)', v_max_photos;
  END IF;

  SELECT * INTO v_slot
  FROM public.photo_upload_slots
  WHERE storage_path = p_storage_path
    AND hangout_id = p_hangout_id
    AND participant_id = v_participant.id
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload slot expired or invalid. Try capturing again.';
  END IF;

  INSERT INTO public.photos (
    hangout_id,
    participant_id,
    storage_path
  )
  VALUES (
    p_hangout_id,
    v_participant.id,
    p_storage_path
  )
  RETURNING * INTO v_photo;

  UPDATE public.participants
  SET photos_taken = photos_taken + 1
  WHERE id = v_participant.id
  RETURNING * INTO v_participant;

  UPDATE public.photo_upload_slots
  SET used_at = now()
  WHERE storage_path = p_storage_path;

  RETURN jsonb_build_object(
    'participant', public.build_participant_session_json(v_participant, true),
    'photo', jsonb_build_object(
      'id', v_photo.id,
      'hangout_id', v_photo.hangout_id,
      'participant_id', v_photo.participant_id,
      'storage_path', v_photo.storage_path,
      'captured_at', v_photo.captured_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This photo was already saved';
END;
$$;

-- ---------------------------------------------------------------------------
-- Storage policies — upload only via prepared slot
-- ---------------------------------------------------------------------------

CREATE POLICY hangout_photos_insert_via_slot
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'hangout-photos'
  AND EXISTS (
    SELECT 1
    FROM public.photo_upload_slots slot
    WHERE slot.storage_path = name
      AND slot.used_at IS NULL
      AND slot.expires_at > now()
  )
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.prepare_photo_upload(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_photo(UUID, UUID, TEXT) TO anon, authenticated;
