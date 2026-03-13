'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from '@/components/icons';
import { Calendar } from '@/components/Calendar';
import { supabase } from '@/lib/supabaseClient';

const PLACEHOLDER = 'Information not available';

function safeStr(val: unknown): string {
  if (val == null) return PLACEHOLDER;
  const s = String(val).trim();
  return s || PLACEHOLDER;
}

function safeSpecializations(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
}

function safeId(params: unknown): string | undefined {
  if (!params || typeof params !== 'object' || !('id' in params)) return undefined;
  const id = (params as { id?: unknown }).id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (Array.isArray(id) && typeof id[0] === 'string' && id[0].trim()) return id[0].trim();
  return undefined;
}

type Counselor = {
  id: string;
  display_name: string;
  bio?: string;
  accolades?: string;
  specializations?: string[];
  avatar_url?: string;
};

export default function CounselorProfilePage() {
  const params = useParams();
  const id = safeId(params);
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError('Counselor not found');
        setLoading(false);
        return;
      }
      setError('');
      try {
        const res = await fetch(`/api/counselors/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data) {
          const msg = (data as { error?: string })?.error || 'Counselor not found';
          if (!cancelled) {
            setError(msg);
            setCounselor(null);
          }
          return;
        }
        if (!cancelled) {
          setCounselor(data as Counselor);
        }

        // Load available dates from availability_slots so the calendar can highlight them.
        const nowIso = new Date().toISOString();
        const { data: slots, error: slotsError } = await supabase
          .from('availability_slots')
          .select('start_time')
          .eq('counselor_id', id)
          .eq('is_booked', false)
          .gte('start_time', nowIso);

        if (!cancelled) {
          if (slotsError) {
            console.error('[counselor profile] load slots error:', slotsError);
          } else if (Array.isArray(slots)) {
            const dates = Array.from(
              new Set(
                slots
                  .map((s) => {
                    const dt = s?.start_time ? new Date(String(s.start_time)) : null;
                    return dt ? dt.toLocaleDateString('en-CA') : null;
                  })
                  .filter((v): v is string => !!v),
              ),
            );
            setAvailableDates(dates);
            if (!selectedDate && dates.length > 0) {
              setSelectedDate(dates[0]);
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong';
        if (!cancelled) {
          console.error('[counselor profile] load error:', e);
          setError(msg);
          setCounselor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-muted-foreground">Counselor not found.</p>
        <Link
          href="/counselors"
          className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          Back to counselors
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading counselor…</p>
      </div>
    );
  }

  if (error && !counselor) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
        <Link
          href="/counselors"
          className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          Back to counselors
        </Link>
      </div>
    );
  }

  if (!counselor) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-muted-foreground">Counselor not found.</p>
        <Link
          href="/counselors"
          className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          Back to counselors
        </Link>
      </div>
    );
  }

  const specList = safeSpecializations(counselor.specializations);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Link
        href="/counselors"
        className="text-sm font-medium text-primary hover:underline mb-6 inline-block"
      >
        ← Back to counselors
      </Link>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            {counselor.avatar_url ? (
              <img
                src={counselor.avatar_url}
                alt=""
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl sm:text-3xl font-semibold text-primary">
                {counselor.display_name?.trim()
                  ? counselor.display_name.trim().charAt(0).toUpperCase()
                  : '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">
              {safeStr(counselor.display_name)}
            </h1>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Specialization
              </h3>
              {specList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {specList.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{PLACEHOLDER}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Credentials &amp; accolades
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {safeStr(counselor.accolades)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Bio
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {safeStr(counselor.bio)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <h2 className="font-headline text-lg sm:text-xl font-semibold text-foreground mb-3">
          Choose a date
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pick a date to see available time slots with this counselor on the next step. Dates with availability are highlighted.
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
          <Calendar
            selectedDate={selectedDate}
            onSelect={(date) => setSelectedDate(date)}
            highlightDates={availableDates}
            title="Availability"
          />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? `Selected date: ${new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`
                : 'Select a highlighted date on the calendar to continue.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!selectedDate || !id) return;
                router.push(`/book/${encodeURIComponent(id)}?date=${selectedDate}`);
              }}
              disabled={!selectedDate}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            >
              View available times
            </button>
            <p className="text-xs text-muted-foreground">
              You&apos;ll choose a specific time slot on the next page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
