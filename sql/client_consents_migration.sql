-- ============================
-- CLIENT CONSENTS & BOOKING UPDATES
-- ============================
-- Run this after the main schema. Adds client_consents table and consent_generated on bookings.

-- 1. Add consent_generated to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'consent_generated'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN consent_generated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. Allow status 'paid' (drop existing check and re-add with 'paid')
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'paid'));

-- 3. Create client_consents table
CREATE TABLE IF NOT EXISTS public.client_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_email TEXT NOT NULL,
  psychologist_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_consents_booking_id ON public.client_consents(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_consents_client_email ON public.client_consents(client_email);
CREATE INDEX IF NOT EXISTS idx_client_consents_psychologist_id ON public.client_consents(psychologist_id);

ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for client_consents" ON public.client_consents;
CREATE POLICY "Allow all for client_consents"
  ON public.client_consents FOR ALL USING (true) WITH CHECK (true);
