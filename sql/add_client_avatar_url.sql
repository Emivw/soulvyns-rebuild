-- Add profile picture URL to users_profile (clients)
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.users_profile.avatar_url IS 'Public URL of client profile picture (e.g. from Storage)';
