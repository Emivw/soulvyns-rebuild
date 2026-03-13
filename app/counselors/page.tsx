'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, Loader2 } from '@/components/icons';
import { FadeInOnScroll } from '@/components/FadeInOnScroll';

interface Counselor {
  id: string;
  display_name: string;
  bio?: string | null;
  accolades?: string | null;
  specializations?: string[] | null;
  avatar_url?: string | null;
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
          .select('id, display_name, bio, accolades, specializations, avatar_url');

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
      <FadeInOnScroll className="relative rounded-xl overflow-hidden mb-10 h-48 sm:h-56 md:h-64 bg-muted">
        <Image
          src="/assets/photos/pexels-shvets-production-7176305.jpg"
          alt="People in a supportive group discussion"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 1152px"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="font-headline text-3xl sm:text-4xl font-bold">Meet Our Counselors</h1>
            <p className="mt-2 text-sm sm:text-base text-white/90">
              Browse our network of professionals and find the right fit for you.
            </p>
          </div>
        </div>
      </FadeInOnScroll>

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
          {counselors.map((c, index) => (
            <FadeInOnScroll key={c.id} delayMs={index * 50}>
              <article className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200">
                <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start gap-4">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-semibold text-muted-foreground flex-shrink-0">
                      {c.display_name?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-headline text-xl font-semibold text-foreground">{c.display_name}</h2>
                    {c.specializations && c.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.specializations.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {c.bio && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{c.bio}</p>
                )}
                {c.accolades && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.accolades}</p>
                )}
                  <Link
                    href={`/counselor/${c.id}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    View Availability
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </article>
            </FadeInOnScroll>
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
