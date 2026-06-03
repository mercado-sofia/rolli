-- Rolli: fix camera upload RLS on storage.objects
--
-- The INSERT policy on storage.objects checks photo_upload_slots, but that
-- table has RLS enabled with no SELECT policies for anon. The EXISTS subquery
-- always fails, causing "new row violates row-level security policy" on upload.
--
-- Use a SECURITY DEFINER helper so slot validation bypasses table RLS safely.

CREATE OR REPLACE FUNCTION public.can_upload_to_storage_path(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.photo_upload_slots slot
    WHERE slot.storage_path = p_path
      AND slot.used_at IS NULL
      AND slot.expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_upload_to_storage_path(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS hangout_photos_insert_via_slot ON storage.objects;

CREATE POLICY hangout_photos_insert_via_slot
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'hangout-photos'
  AND public.can_upload_to_storage_path(name)
);

-- Same pattern for reading photos after reveal (photos/hangouts tables are RLS-locked).

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

GRANT EXECUTE ON FUNCTION public.can_read_hangout_photo(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS hangout_photos_read_after_reveal ON storage.objects;

CREATE POLICY hangout_photos_read_after_reveal
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'hangout-photos'
  AND public.can_read_hangout_photo(name)
);
