'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CounselorErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('counselor_error');
    if (stored) {
      setMessage(stored);
      sessionStorage.removeItem('counselor_error');
    }
  }, []);

  if (!message) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between gap-4">
      <p className="text-amber-800 text-sm flex-1">{message}</p>
      <Link
        href="/login"
        className="shrink-0 text-amber-700 hover:text-amber-900 font-medium text-sm underline"
      >
        Try again
      </Link>
    </div>
  );
}
