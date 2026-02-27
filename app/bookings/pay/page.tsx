'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const PAYFAST_PAYLOAD_KEY = 'soulvyns_payfast_payload';

function getPayloadFromStorage(): { slotId: string; amount: number; clientEmail: string; firstName: string; lastName: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PAYFAST_PAYLOAD_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.slotId || typeof parsed.amount !== 'number') return null;
    return {
      slotId: String(parsed.slotId),
      amount: Number(parsed.amount),
      clientEmail: String(parsed.clientEmail ?? ''),
      firstName: String(parsed.firstName ?? ''),
      lastName: String(parsed.lastName ?? ''),
    };
  } catch {
    return null;
  }
}

export default function BookingPayPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');

  const goToPayFast = useCallback(async () => {
    setError(null);
    setStatus('loading');

    const payload = getPayloadFromStorage();
    if (!payload) {
      setError('No payment session found. Please go back and complete the booking again.');
      setStatus('error');
      return;
    }

    setStatus('redirecting');

    try {
      const formRes = await fetch('/api/bookings/payfast-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: payload.slotId,
          amount: payload.amount,
          clientEmail: payload.clientEmail,
          firstName: payload.firstName,
          lastName: payload.lastName,
        }),
      });

      if (!formRes.ok) {
        let msg = 'Failed to load payment form.';
        try {
          const err = await formRes.json();
          msg = err?.error || err?.detail || msg;
        } catch {
          if (formRes.status >= 500) msg = 'Payment service is temporarily unavailable. Please try again in a moment.';
          else if (formRes.status === 401) msg = 'Session expired. Please start the booking again.';
        }
        throw new Error(msg);
      }

      const html = await formRes.text();
      sessionStorage.removeItem(PAYFAST_PAYLOAD_KEY);

      document.open();
      document.write(html);
      document.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    goToPayFast();
  }, [goToPayFast]);

  if (status === 'error' && error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={goToPayFast}
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
            >
              Try again
            </button>
            <Link
              href="/book"
              className="inline-block border border-border px-6 py-3 rounded-lg font-medium text-foreground hover:bg-muted/50"
            >
              Back to booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-4" />
        <p className="text-lg font-medium text-foreground">
          {status === 'redirecting' ? 'Redirecting to PayFast...' : 'Preparing payment...'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Do not close this window.
        </p>
      </div>
    </div>
  );
}
