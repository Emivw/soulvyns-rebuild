'use client';

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';

/**
 * Loaded inside the popup window after Microsoft redirects.
 * Runs handleRedirectPromise() so the parent window's loginPopup() resolves, then closes the popup.
 */
export default function CounselorLoginPopupPage() {
  const { instance } = useMsal();
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing');

  useEffect(() => {
    let cancelled = false;

    instance
      .handleRedirectPromise()
      .then(() => {
        if (!cancelled) {
          setStatus('done');
          window.close();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Popup redirect handling error:', err);
          setStatus('error');
          setTimeout(() => window.close(), 2000);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instance]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      {status === 'processing' && (
        <p className="text-gray-600">Completing sign in...</p>
      )}
      {status === 'done' && (
        <p className="text-gray-600">Sign in complete. Closing...</p>
      )}
      {status === 'error' && (
        <p className="text-red-600">Something went wrong. This window will close.</p>
      )}
    </div>
  );
}
