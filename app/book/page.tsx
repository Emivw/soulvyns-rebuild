'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Counselor {
  id: string;
  display_name: string;
  email: string;
}

export default function BookPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        await loadCounselors();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [error, setError] = useState('');

  const loadCounselors = async () => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('counselors')
        .select('id, display_name, email');

      if (error) {
        console.error('Error loading counselors:', error);
        setError('Failed to load counselors. Please try again.');
        return;
      }
      setCounselors(data || []);
    } catch (err: unknown) {
      console.error('Error loading counselors:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading counselors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Book a Session</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {counselors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No counselors available at this time.</p>
              <p className="text-gray-400 text-sm">Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {counselors.map((counselor) => (
                <Link
                  key={counselor.id}
                  href={`/book/${counselor.id}`}
                  className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{counselor.display_name}</h2>
                  <p className="text-sm text-gray-600">{counselor.email}</p>
                  <div className="mt-4 text-blue-600 text-sm font-medium">
                    View Available Slots →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
