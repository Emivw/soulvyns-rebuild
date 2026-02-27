-- ============================================
-- SOULVYNS COMPLETE DATABASE SCHEMA
-- ============================================
-- This script creates all tables, indexes, RLS policies, and triggers
-- needed for the Soulvyns MVP application.
-- 
-- Run this script in the Supabase SQL Editor:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" or press Ctrl+Enter
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users Profile Table (extends Supabase Auth)
-- Links to auth.users and stores role and profile information
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('client', 'counselor')),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counselors Table
-- Stores counselor-specific information and Microsoft Graph email
CREATE TABLE IF NOT EXISTS public.counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  ms_graph_user_email TEXT NOT NULL, -- Email for Graph API meeting creation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability Slots Table
-- Stores time slots that counselors make available for booking
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Bookings Table
-- Stores client bookings for counseling sessions
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment' 
    CHECK (status IN ('pending_payment', 'confirmed', 'paid', 'cancelled')),
  amount NUMERIC(10, 2) NOT NULL,
  payfast_payment_id TEXT,
  meeting_url TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Indexes improve query performance for common access patterns

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_counselor_id ON public.bookings(counselor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- Availability slots indexes
CREATE INDEX IF NOT EXISTS idx_availability_slots_counselor_id ON public.availability_slots(counselor_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_start_time ON public.availability_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_slots_is_booked ON public.availability_slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_availability_slots_counselor_booked ON public.availability_slots(counselor_id, is_booked);

-- Counselors indexes
CREATE INDEX IF NOT EXISTS idx_counselors_user_id ON public.counselors(user_id);
CREATE INDEX IF NOT EXISTS idx_counselors_email ON public.counselors(email);

-- Users profile indexes
CREATE INDEX IF NOT EXISTS idx_users_profile_email ON public.users_profile(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_role ON public.users_profile(role);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables for security

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Public can view counselors" ON public.counselors;
DROP POLICY IF EXISTS "Counselors can view own record" ON public.counselors;
DROP POLICY IF EXISTS "Public can view available slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Counselors can manage own availability" ON public.availability_slots;
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Counselors can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can manage all bookings" ON public.bookings;

-- ============================================
-- USERS_PROFILE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.users_profile
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users_profile
FOR UPDATE
USING (auth.uid() = id);

-- Allow insert for trigger (SECURITY DEFINER function will bypass RLS)
-- This is needed for the trigger to work properly
CREATE POLICY "Users can insert own profile"
ON public.users_profile
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- COUNSELORS POLICIES
-- ============================================

-- Public can view all counselors (needed for booking page)
CREATE POLICY "Public can view counselors"
ON public.counselors
FOR SELECT
USING (true);

-- Counselors can view their own counselor record
CREATE POLICY "Counselors can view own record"
ON public.counselors
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- AVAILABILITY_SLOTS POLICIES
-- ============================================

-- Public can view available (unbooked) slots
CREATE POLICY "Public can view available slots"
ON public.availability_slots
FOR SELECT
USING (is_booked = false);

-- Counselors can manage (SELECT, INSERT, UPDATE, DELETE) their own availability slots
CREATE POLICY "Counselors can manage own availability"
ON public.availability_slots
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = availability_slots.counselor_id
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = availability_slots.counselor_id
    AND c.user_id = auth.uid()
  )
);

-- ============================================
-- BOOKINGS POLICIES
-- ============================================

-- Clients can view their own bookings
CREATE POLICY "Clients can view own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = client_id);

-- Counselors can view bookings assigned to them
CREATE POLICY "Counselors can view their bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = bookings.counselor_id
    AND c.user_id = auth.uid()
  )
);

-- Clients can create bookings (must be authenticated and booking must be for them)
CREATE POLICY "Clients can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Note: Updates to bookings (status changes, meeting URL) are handled server-side
-- via service role key, so no RLS policy needed for UPDATE

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to automatically create user profile on signup
-- This ensures every user in auth.users gets a corresponding profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users_profile
DROP TRIGGER IF EXISTS update_users_profile_updated_at ON public.users_profile;
CREATE TRIGGER update_users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on counselors
DROP TRIGGER IF EXISTS update_counselors_updated_at ON public.counselors;
CREATE TRIGGER update_counselors_updated_at
  BEFORE UPDATE ON public.counselors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE public.users_profile IS 'User profiles linked to Supabase Auth users. Stores role (client/counselor) and profile information.';
COMMENT ON TABLE public.counselors IS 'Counselor records with Microsoft Graph email for Teams meeting creation.';
COMMENT ON TABLE public.availability_slots IS 'Time slots that counselors make available for booking.';
COMMENT ON TABLE public.bookings IS 'Client bookings for counseling sessions. Links clients, counselors, and time slots.';

COMMENT ON COLUMN public.users_profile.role IS 'User role: "client" or "counselor"';
COMMENT ON COLUMN public.counselors.ms_graph_user_email IS 'Email address used for Microsoft Graph API to create Teams meetings';
COMMENT ON COLUMN public.bookings.status IS 'Booking status: "pending_payment", "confirmed", "paid", or "cancelled"';
COMMENT ON COLUMN public.bookings.meeting_url IS 'Microsoft Teams meeting join URL, created after payment confirmation';

-- ============================================
-- VERIFICATION QUERIES (Optional - can be run after schema creation)
-- ============================================
-- Uncomment these to verify the schema was created correctly:

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('users_profile', 'counselors', 'availability_slots', 'bookings');

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- SELECT trigger_name, event_manipulation, event_object_table, action_statement 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public';

-- ============================================
-- MIGRATION: Allow 'paid' status (if table already existed)
-- Run this in Supabase SQL Editor if bookings was created before 'paid' was added.
-- ============================================
-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
-- ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
--   CHECK (status IN ('pending_payment', 'confirmed', 'paid', 'cancelled'));

-- ============================================
-- END OF SCHEMA
-- ============================================
