-- ============================================
-- SOULVYNS SESSIONS TABLE
-- ============================================
-- RUN THIS in Supabase Dashboard → SQL Editor
-- (Required for the counselor booking flow; otherwise you get errors.)
-- One row per booked session (client + counselor + date + time).
-- ============================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sessions_valid_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_counselor_id ON public.sessions(counselor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_counselor_date ON public.sessions(counselor_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);

COMMENT ON TABLE public.sessions IS 'Booked sessions (counselor_availability-based flow).';
COMMENT ON COLUMN public.sessions.session_date IS 'Date of the session.';
COMMENT ON COLUMN public.sessions.start_time IS 'Session start time (local/day context).';
COMMENT ON COLUMN public.sessions.end_time IS 'Session end time (local/day context).';

-- RLS: clients can read/insert own; service role used for updates (payment)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own sessions" ON public.sessions;
CREATE POLICY "Clients can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create own sessions" ON public.sessions;
CREATE POLICY "Clients can create own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);
