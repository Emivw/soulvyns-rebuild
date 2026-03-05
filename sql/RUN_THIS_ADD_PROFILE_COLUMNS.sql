-- ============================================
-- Add missing profile columns to users_profile
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor if you see:
-- "Could not find the 'ailments' column of 'users_profile' in the schema cache"
-- ============================================

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS ailments TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.users_profile.phone IS 'Client phone (optional)';
COMMENT ON COLUMN public.users_profile.date_of_birth IS 'Client DOB (optional)';
COMMENT ON COLUMN public.users_profile.ailments IS 'What the client is dealing with (for counselor context)';
COMMENT ON COLUMN public.users_profile.medical_notes IS 'Medical info relevant for counseling';
COMMENT ON COLUMN public.users_profile.avatar_url IS 'Public URL of client profile picture (e.g. from Storage)';
