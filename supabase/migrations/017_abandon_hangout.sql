-- Rolli: cancelled hangout status (run before 018_abandon_hangout_rpc.sql)

ALTER TYPE public.hangout_status ADD VALUE IF NOT EXISTS 'cancelled';
