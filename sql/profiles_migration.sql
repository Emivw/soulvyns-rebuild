-- ============================================
-- SOULVYNS PROFILES MIGRATION
-- ============================================
-- Run after complete_schema.sql and client_consents_migration.sql
-- Adds: counselor bio/accolades/specializations, client profile fields
-- ============================================

-- Counselors: bio, accolades, specializations (for public profile and dashboard)
ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS accolades TEXT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.counselors.bio IS 'Short bio for public counselor profile';
COMMENT ON COLUMN public.counselors.accolades IS 'Credentials, awards, or accolades (plain text or markdown)';
COMMENT ON COLUMN public.counselors.specializations IS 'Array of specialization labels e.g. Anxiety, Depression';

-- Users profile (clients): optional personal/medical info for counselor context
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS ailments TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT;

COMMENT ON COLUMN public.users_profile.phone IS 'Client phone (optional)';
COMMENT ON COLUMN public.users_profile.date_of_birth IS 'Client DOB (optional)';
COMMENT ON COLUMN public.users_profile.ailments IS 'What the client is dealing with (for counselor context)';
COMMENT ON COLUMN public.users_profile.medical_notes IS 'Medical info relevant for counseling';
