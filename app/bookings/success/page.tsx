'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Confetti from 'react-confetti';
import { supabase } from '@/lib/supabaseClient';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [status, setStatus] = useState<'pending' | 'paid' | 'timeout' | 'unknown'>(
    bookingId ? 'pending' : 'paid',
  );
  const [confettiDims, setConfettiDims] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    function updateSize() {
      if (typeof window === 'undefined') return;
      setConfettiDims({ width: window.innerWidth, height: window.innerHeight });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) return;

      if (data?.status === 'paid' || data?.payment_status === 'paid') {
        setStatus('paid');
        return;
      }

      if (Date.now() >= deadline) {
        setStatus('timeout');
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const isPaid = status === 'paid' || !bookingId;

  useEffect(() => {
    if (isPaid) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isPaid]);

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      {showConfetti && confettiDims.width > 0 && confettiDims.height > 0 && (
        <Confetti
          width={confettiDims.width}
          height={confettiDims.height}
          numberOfPieces={400}
          recycle={false}
        />
      )}
      <div className="max-w-md w-full">
        <div className="bg-white/90 shadow-2xl rounded-2xl p-8 text-center border border-emerald-50 animate-in fade-in-50 zoom-in-95 duration-500">
          <div className="mb-6">
            {isPaid ? (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 shadow-inner animate-in zoom-in-95 fade-in-50 duration-500">
                <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : status === 'timeout' ? (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-50 shadow-inner">
                <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-sky-50 shadow-inner">
                <svg className="h-10 w-10 text-sky-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {isPaid && (
            <>
              <h1 className="text-3xl font-headline font-bold text-gray-900 mb-3">Payment successful</h1>
              <p className="text-gray-600 mb-6">
                Your session is confirmed. We’ve emailed your Microsoft Teams link and booking details.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <h1 className="text-3xl font-headline font-bold text-gray-900 mb-3">Confirming your payment</h1>
              <p className="text-gray-600 mb-6">
                We&apos;re updating your booking. This usually takes a few seconds. You can wait here or open My Bookings.
              </p>
            </>
          )}

          {status === 'timeout' && (
            <>
              <h1 className="text-3xl font-headline font-bold text-gray-900 mb-3">Payment received</h1>
              <p className="text-gray-600 mb-6">
                Your payment was successful. If your booking does not show as confirmed in a few minutes, check My Bookings
                or contact support. Our server may still be finishing up.
              </p>
            </>
          )}

          <div className="space-y-4">
            <Link
              href="/my-bookings"
              className="block w-full bg-emerald-500 text-white py-3 px-6 rounded-lg hover:bg-emerald-600 transition font-medium shadow-md hover:shadow-lg"
            >
              View my bookings
            </Link>
            <Link
              href="/book"
              className="block w-full text-emerald-700 hover:text-emerald-900 text-sm font-medium"
            >
              Book another session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
