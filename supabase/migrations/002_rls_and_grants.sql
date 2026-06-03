-- Rolli: Row Level Security
-- Tables are locked down; the app uses SECURITY DEFINER RPC functions.

ALTER TABLE public.hangouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- No permissive policies for anon/authenticated on base tables.
-- All access goes through RPC functions defined in 003_rpc_functions.sql.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON TYPE public.hangout_status TO anon, authenticated;
