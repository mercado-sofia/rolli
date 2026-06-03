-- Rolli: enable Supabase Realtime for hangout status updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.hangouts;
