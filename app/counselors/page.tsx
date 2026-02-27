'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, Loader2 } from '@/components/icons';

interface Counselor {
  id: string;
  display_name: string;
  email: string;
}

export default function CounselorsPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('counselors')
          .select('id, display_name, email');

        if (error) throw error;
        setCounselors(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load counselors');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-foreground">Meet Our Counselors</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Browse our network of professionals and find the right fit for you.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && counselors.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {counselors.map((c) => (
            <div
              key={c.id}
              className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="font-headline text-xl font-semibold text-foreground">{c.display_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{c.email}</p>
              <Link
                href={`/book/${c.id}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                Book session
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && counselors.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No counselors are currently listed. Check back later.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
