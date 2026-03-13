'use client';

import Link from 'next/link';

export default function BookingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          We couldn’t load this page. You can try again or go to your bookings.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
          >
            Try again
          </button>
            <Link
              href="/my-bookings"
            className="inline-block border border-border px-6 py-3 rounded-lg font-medium text-foreground hover:bg-muted/50"
          >
            My Bookings
          </Link>
          <Link href="/" className="inline-block text-muted-foreground hover:text-foreground text-sm">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
