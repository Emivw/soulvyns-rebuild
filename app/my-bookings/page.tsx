'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyBookingsGate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        router.replace('/bookings');
      } else {
        router.replace('/login');
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

