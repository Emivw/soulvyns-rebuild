'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { loginRequest } from '@/lib/msalConfig';
import Link from 'next/link';

/**
 * Unified login: Client (email/password) and Counselor (Microsoft popup) on one screen.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  const [popupLoading, setPopupLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { instance } = useMsal();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/client/dashboard');
        router.refresh();
        return;
      }
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        const email = account.username;
        const displayName = account.name ?? email.split('@')[0] ?? 'Counselor';
        try {
          const tokenResponse = await instance.acquireTokenSilent({ ...loginRequest, account });
          if (tokenResponse?.accessToken) {
            const res = await fetch('/api/counselors/ensure', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenResponse.accessToken}`,
              },
              body: JSON.stringify({ email, displayName }),
            });
            if (res.ok) {
              if (typeof window !== 'undefined') {
                window.location.href = '/counselor/dashboard';
              } else {
                router.replace('/counselor/dashboard');
                router.refresh();
              }
              return;
            }
          }
        } catch {
          // fall back to verify
        }
        const redirected = await verifyCounselorAndRedirect(email);
        if (!redirected) {
          setError('You are signed in with Microsoft but this account is not registered as a counselor. Ask an administrator to add you, or sign out and sign in as a client.');
        }
        return;
      }
      setCheckingAuth(false);
    };
    run();
  }, [instance, router]);

  const verifyCounselorAndRedirect = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/counselors/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.location.href = '/counselor/dashboard';
        } else {
          router.replace('/counselor/dashboard');
          router.refresh();
        }
        return true;
      }
    } catch {
      // fall through
    }
    setCheckingAuth(false);
    return false;
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message?.toLowerCase().includes('email not confirmed') || signInError.message?.toLowerCase().includes('confirm')) {
          setError('Please verify your email first. Check your inbox, then sign in again.');
        } else {
          setError(signInError.message || 'Invalid email or password.');
        }
        return;
      }

      if (data.user) {
        router.replace('/client/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleCounselorLogin = async () => {
    setError('');
    setPopupLoading(true);
    try {
      const response = await instance.loginPopup(loginRequest);
      if (!response?.account) {
        setError('Sign in was cancelled or failed.');
        return;
      }
      const email = response.account.username;
      const displayName = response.account.name ?? email.split('@')[0] ?? 'Counselor';
      const accessToken = response.accessToken;
      if (accessToken) {
        const res = await fetch('/api/counselors/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ email, displayName }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (typeof window !== 'undefined') {
            window.location.href = '/counselor/dashboard';
          } else {
            router.replace('/counselor/dashboard');
            router.refresh();
          }
          return;
        }
        if (res.status === 403) {
          const msg = data.error || 'You must be in Soulvyns Counselors or Soulvyns Admin to sign in as a counselor.';
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('counselor_error', msg);
            window.location.href = '/';
          } else {
            setError(msg);
          }
          return;
        }
        setError(data.error || 'Counselor sign-in failed. Please try again.');
        return;
      }
      const redirected = await verifyCounselorAndRedirect(email);
      if (!redirected) {
        const msg = 'You are not registered as a counselor. Ask an administrator to add this account.';
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('counselor_error', msg);
          window.location.href = '/';
        } else {
          setError(msg);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      const displayMsg = msg.toLowerCase().includes('user_cancelled') || msg.toLowerCase().includes('user canceled')
        ? 'Sign in was cancelled.'
        : msg;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('counselor_error', displayMsg);
        window.location.href = '/';
      } else {
        setError(displayMsg);
      }
    } finally {
      setPopupLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Sign in</h1>
          <p className="text-gray-600 text-center mb-8">Choose how you want to sign in</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Client login */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Client</h2>
            <form onSubmit={handleClientLogin} className="space-y-4">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={clientLoading}
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={clientLoading}
              />
              <button
                type="submit"
                disabled={clientLoading}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition font-medium"
              >
                {clientLoading ? 'Signing in...' : 'Sign in as client'}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Counselor login */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Counselor</h2>
            <button
              type="button"
              onClick={handleCounselorLogin}
              disabled={popupLoading}
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
            >
              {popupLoading ? 'Opening sign-in window...' : 'Sign in with Microsoft'}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            New to Soulvyns?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
