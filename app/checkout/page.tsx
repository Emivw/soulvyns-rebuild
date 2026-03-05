'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from '@/components/icons';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');
  const [session, setSession] = useState<{
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string;
  } | null>(null);
  const [counselor, setCounselor] = useState<{
    id: string;
    display_name: string;
    avatar_url?: string;
  } | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('No session specified');
      return;
    }
    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        setError('Please sign in to complete checkout');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(res.status === 403 ? 'You do not have access to this session.' : (data.error || 'Session not found'));
          setLoading(false);
          return;
        }
        setSession(data.session);
        setCounselor(data.counselor ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleMockPay = async () => {
    if (!sessionId || !session || session.payment_status === 'paid') return;
    setPaying(true);
    setError('');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        setError('Session expired. Please sign in again.');
        setPaying(false);
        return;
      }
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authSession.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 403 ? 'You do not have permission to update this session.' : (data.error || 'Payment failed'));
        setPaying(false);
        return;
      }
      setPaid(true);
      setSession((prev) => (prev ? { ...prev, payment_status: 'paid', status: 'confirmed' } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
        <Link href="/counselors" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to counselors
        </Link>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-6 text-center">
          <h1 className="font-headline text-xl font-bold text-emerald-800 dark:text-emerald-200">
            Booking confirmed
          </h1>
          <p className="mt-2 text-emerald-700 dark:text-emerald-300">
            Your session with {counselor?.display_name ?? 'your counselor'} is confirmed.
          </p>
          {session && (
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
              {new Date(session.session_date + 'T' + session.start_time).toLocaleString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              – {session.end_time}
            </p>
          )}
          <Link
            href="/client/dashboard"
            className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const dateLabel = new Date(session.session_date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-headline text-2xl font-bold text-foreground mb-6">Checkout</h1>

      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        {counselor && (
          <div className="flex items-center gap-3 mb-4">
            {counselor.avatar_url ? (
              <img
                src={counselor.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center font-semibold text-muted-foreground">
                {counselor.display_name?.charAt(0) ?? '?'}
              </div>
            )}
            <span className="font-semibold text-foreground">{counselor.display_name}</span>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {dateLabel}, {session.start_time} – {session.end_time}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This is a mock checkout. No real payment is taken.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={paying || session.payment_status === 'paid'}
        onClick={handleMockPay}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : session.payment_status === 'paid' ? (
          'Paid'
        ) : (
          'Complete Payment'
        )}
      </button>

      <Link href="/counselors" className="mt-4 block text-center text-sm font-medium text-primary hover:underline">
        Back to counselors
      </Link>
    </div>
  );
}
