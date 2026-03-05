-- ============================================
-- Add missing columns to counselors
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor if you see:
-- "Could not find the 'accolades' column" or "column counselors.email does not exist"
-- ============================================

-- Core column (if table was created without it)
ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from ms_graph_user_email for any existing rows
UPDATE public.counselors SET email = ms_graph_user_email WHERE email IS NULL AND ms_graph_user_email IS NOT NULL;

-- Profile columns
ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS accolades TEXT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.counselors.email IS 'Counselor email (for login/lookup)';
COMMENT ON COLUMN public.counselors.bio IS 'Short bio for public counselor profile';
COMMENT ON COLUMN public.counselors.accolades IS 'Credentials, awards, or accolades (plain text or markdown)';
COMMENT ON COLUMN public.counselors.specializations IS 'Array of specialization labels e.g. Anxiety, Depression';
COMMENT ON COLUMN public.counselors.avatar_url IS 'Public URL of counselor profile picture (e.g. from Storage)';
