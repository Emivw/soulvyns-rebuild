-- ============================================
-- RLS: counselor_availability + sessions
-- ============================================
-- Run in Supabase Dashboard → SQL Editor (after sessions_table.sql and counselor_availability).
--
-- counselor_availability:
--   - Anyone can SELECT (clients see availability on counselor profile).
--   - Only the counselor (counselors.user_id = auth.uid()) can INSERT/UPDATE/DELETE.
--
-- sessions:
--   - Clients: SELECT/INSERT/UPDATE where client_id = auth.uid().
--   - Counselors: SELECT/UPDATE where counselor_id matches their row (counselors.user_id = auth.uid()).
--
-- Ensure counselors.user_id is set (e.g. via api/dev/register-counselor) so counselor RLS works.
-- ============================================

-- Ensure counselors has user_id for RLS (link to auth.uid())
ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_counselors_user_id ON public.counselors(user_id);

-- ============================================
-- counselor_availability
-- ============================================
ALTER TABLE public.counselor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view counselor availability" ON public.counselor_availability;
CREATE POLICY "Anyone can view counselor availability"
  ON public.counselor_availability FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Counselors can insert own availability" ON public.counselor_availability;
CREATE POLICY "Counselors can insert own availability"
  ON public.counselor_availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = counselor_availability.counselor_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Counselors can update own availability" ON public.counselor_availability;
CREATE POLICY "Counselors can update own availability"
  ON public.counselor_availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = counselor_availability.counselor_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = counselor_availability.counselor_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Counselors can delete own availability" ON public.counselor_availability;
CREATE POLICY "Counselors can delete own availability"
  ON public.counselor_availability FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = counselor_availability.counselor_id
      AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- sessions (extend existing client policies)
-- ============================================
-- Keep existing: "Clients can view own sessions", "Clients can create own sessions"

-- Counselors can view sessions booked with them
DROP POLICY IF EXISTS "Counselors can view their sessions" ON public.sessions;
CREATE POLICY "Counselors can view their sessions"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = sessions.counselor_id
      AND c.user_id = auth.uid()
    )
  );

-- Clients can update own session (e.g. payment); counselors can update session status
DROP POLICY IF EXISTS "Clients can update own sessions" ON public.sessions;
CREATE POLICY "Clients can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Counselors can update their sessions" ON public.sessions;
CREATE POLICY "Counselors can update their sessions"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = sessions.counselor_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.counselors c
      WHERE c.id = sessions.counselor_id
      AND c.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.counselor_availability IS 'RLS: public SELECT; counselors CRUD own rows via counselors.user_id = auth.uid().';
COMMENT ON TABLE public.sessions IS 'RLS: clients own rows by client_id = auth.uid(); counselors see/update by counselor_id → counselors.user_id = auth.uid().';
