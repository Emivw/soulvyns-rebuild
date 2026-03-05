-- Add profile picture URL to counselors
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.counselors.avatar_url IS 'Public URL of counselor profile picture (e.g. from Storage)';
