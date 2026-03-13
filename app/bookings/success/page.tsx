'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [status, setStatus] = useState<'pending' | 'paid' | 'timeout' | 'unknown'>(
    bookingId ? 'pending' : 'paid',
  );

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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            {isPaid ? (
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : status === 'timeout' ? (
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100">
                <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {isPaid && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
              <p className="text-gray-600 mb-8">
                Your booking has been confirmed. You will receive meeting details via email shortly.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Confirming your payment</h1>
              <p className="text-gray-600 mb-8">
                We’re updating your booking. This usually takes a few seconds. You can wait here or open My Bookings.
              </p>
            </>
          )}

          {status === 'timeout' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment received</h1>
              <p className="text-gray-600 mb-8">
                Your payment was successful. If your booking does not show as confirmed in a few minutes, check My Bookings or contact support. Our server may still be processing the payment.
              </p>
            </>
          )}

          <div className="space-y-4">
            <Link
              href="/bookings"
              className="block w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition font-medium"
            >
              View My Bookings
            </Link>
            <Link
              href="/book"
              className="block w-full text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Book Another Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
