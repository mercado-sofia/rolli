-- Rolli: core schema
-- Run in Supabase SQL Editor (or via supabase db push)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.hangout_status AS ENUM (
  'waiting',
  'active',
  'developing',
  'revealing',
  'guessing',
  'completed'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.hangouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status public.hangout_status NOT NULL DEFAULT 'waiting',
  film_keeper_id UUID,
  participant_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hangouts_slug_unique UNIQUE (slug),
  CONSTRAINT hangouts_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT hangouts_participant_count_non_negative CHECK (participant_count >= 0)
);

CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id UUID NOT NULL REFERENCES public.hangouts (id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  real_name TEXT NOT NULL,
  session_token UUID NOT NULL DEFAULT gen_random_uuid(),
  is_film_keeper BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  photos_taken INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT participants_session_token_unique UNIQUE (session_token),
  CONSTRAINT participants_nickname_per_hangout UNIQUE (hangout_id, nickname),
  CONSTRAINT participants_photos_taken_non_negative CHECK (photos_taken >= 0),
  CONSTRAINT participants_photos_taken_max CHECK (photos_taken <= 10)
);

ALTER TABLE public.hangouts
  ADD CONSTRAINT hangouts_film_keeper_id_fkey
  FOREIGN KEY (film_keeper_id) REFERENCES public.participants (id)
  ON DELETE SET NULL;

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id UUID NOT NULL REFERENCES public.hangouts (id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT photos_storage_path_unique UNIQUE (storage_path)
);

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id UUID NOT NULL REFERENCES public.hangouts (id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.participants (id) ON DELETE CASCADE,
  target_participant_id UUID NOT NULL REFERENCES public.participants (id) ON DELETE CASCADE,
  guessed_real_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT votes_voter_target_unique UNIQUE (voter_id, target_participant_id),
  CONSTRAINT votes_no_self_vote CHECK (voter_id <> target_participant_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX hangouts_slug_idx ON public.hangouts (slug);
CREATE INDEX hangouts_status_idx ON public.hangouts (status);
CREATE INDEX participants_hangout_id_idx ON public.participants (hangout_id);
CREATE INDEX participants_session_token_idx ON public.participants (session_token);
CREATE INDEX photos_hangout_id_idx ON public.photos (hangout_id);
CREATE INDEX photos_participant_id_idx ON public.photos (participant_id);
CREATE INDEX votes_hangout_id_idx ON public.votes (hangout_id);

-- ---------------------------------------------------------------------------
-- Triggers: participant_count + updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_hangout_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_hangout_id UUID;
BEGIN
  target_hangout_id := COALESCE(NEW.hangout_id, OLD.hangout_id);

  UPDATE public.hangouts
  SET
    participant_count = (
      SELECT COUNT(*)::INTEGER
      FROM public.participants
      WHERE hangout_id = target_hangout_id
        AND is_active = true
    ),
    updated_at = now()
  WHERE id = target_hangout_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER participants_sync_hangout_count
  AFTER INSERT OR UPDATE OF is_active OR DELETE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_hangout_participant_count();

CREATE OR REPLACE FUNCTION public.set_hangouts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER hangouts_set_updated_at
  BEFORE UPDATE ON public.hangouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hangouts_updated_at();
