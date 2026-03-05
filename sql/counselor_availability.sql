-- ============================================
-- SOULVYNS COUNSELOR AVAILABILITY
-- ============================================
-- Creates per-counselor recurring availability slots (time-of-day, per weekday).
-- Each row is one slot for a given day_of_week.
-- ============================================

CREATE TABLE IF NOT EXISTS public.counselor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  -- 0 = Monday, 6 = Sunday (to match JS getDay()-1 pattern, clamped to 0–6)
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT counselor_availability_valid_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_counselor_availability_counselor_day
  ON public.counselor_availability (counselor_id, day_of_week, start_time);

COMMENT ON TABLE public.counselor_availability IS 'Recurring availability slots for counselors (time-of-day per weekday).';
COMMENT ON COLUMN public.counselor_availability.day_of_week IS '0 = Monday, 6 = Sunday.';

