'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  status: string;
  payment_status?: string | null;
  amount: string;
  meeting_url: string | null;
  created_at: string;
  session_start: string | null;
  session_end: string | null;
  counselors?: { display_name?: string | null }[] | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const router = useRouter();

  const [error, setError] = useState('');

  const loadBookings = async () => {
    try {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBookings([]);
        return;
      }
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          payment_status,
          amount,
          meeting_url,
          created_at,
          session_start,
          session_end,
          counselors(display_name)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        setError('Failed to load bookings. Please try again.');
        setBookings([]);
        return;
      }
      const normalized: Booking[] = (data as any[] ?? []).map((b) => {
        const row = b as any;
        return {
          ...(row as Booking),
          counselors: Array.isArray(row.counselors) ? row.counselors : row.counselors ? [row.counselors] : null,
        };
      });
      setBookings(normalized);
    } catch (err: unknown) {
      console.error('Error loading bookings:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.push('/login');
          return;
        }
        await loadBookings();
      } catch (err) {
        if (cancelled) return;
        console.error('Auth check failed:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const onFocus = () => loadBookings();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleCompletePayment = async (booking: Booking) => {
    try {
      setError('');
      setPayingBookingId(booking.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const clientEmail = user.email ?? '';
      let firstName = '';
      let lastName = '';

      try {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.full_name) {
          const parts = String(profile.full_name).trim().split(/\s+/);
          firstName = parts[0] ?? '';
          lastName = parts.slice(1).join(' ');
        }
      } catch {
        // Non-fatal: fall back to empty names
      }

      const formRes = await fetch('/api/bookings/payfast-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: parseFloat(booking.amount),
          clientEmail,
          firstName,
          lastName,
        }),
      });

      if (!formRes.ok) {
        const err = await formRes.json().catch(() => ({}));
        throw new Error(err?.error || err?.detail || 'Failed to start payment. Please try again.');
      }

      const html = await formRes.text();
      const payWindow = window.open('', '_blank');
      if (payWindow) {
        payWindow.document.write(html);
        payWindow.document.close();
      } else {
        // Fallback: replace current page if popup blocked
        document.open();
        document.write(html);
        document.close();
      }
    } catch (err) {
      console.error('Error restarting payment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start payment. Please try again.'
      );
    } finally {
      setPayingBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">You have no bookings yet.</p>
              <Link
                href="/book"
                className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Book a Session
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Counselor</p>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {booking.counselors?.[0]?.display_name ?? '—'}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        {booking.session_start && booking.session_end ? (
                          <p>
                            <span className="font-medium">Date & Time:</span>{' '}
                            {new Date(booking.session_start).toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            - {new Date(booking.session_end).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        ) : (
                          <p>
                            <span className="font-medium">Date & Time:</span>{' '}
                            <span className="text-gray-400">Not available</span>
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Amount:</span> R{parseFloat(booking.amount).toFixed(2)}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'confirmed' || booking.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending_payment'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status === 'pending_payment'
                          ? 'Pending payment'
                          : booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {booking.status === 'pending_payment' ? (
                        <button
                          type="button"
                          onClick={() => handleCompletePayment(booking)}
                          disabled={payingBookingId === booking.id}
                          className="block mt-3 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:bg-yellow-300 transition text-sm font-medium"
                        >
                          {payingBookingId === booking.id ? 'Opening payment...' : 'Complete payment'}
                        </button>
                      ) : booking.payment_status === 'paid' && booking.meeting_url ? (
                        <a
                          href={booking.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                        >
                          Join Meeting
                        </a>
                      ) : (
                        <span className="block mt-3 text-sm text-gray-400 cursor-not-allowed select-none line-through">
                          Join Meeting
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
