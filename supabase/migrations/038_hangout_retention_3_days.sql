-- Rolli: reduce hangout + storage retention from 7 days to 3 days

CREATE OR REPLACE FUNCTION public.hangout_purge_retention_days()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 3;
$$;

NOTIFY pgrst, 'reload schema';
