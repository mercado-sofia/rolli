-- Allow signed photo URLs during the synced reveal countdown (matches get_reveal_state preload window).

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
      AND (
        h.status IN ('revealing', 'guessing', 'completed')
        OR (
          h.status = 'developing'
          AND h.reveal_countdown_at IS NOT NULL
          AND h.reveal_countdown_at + interval '3 seconds' > clock_timestamp()
        )
      )
  );
$$;
