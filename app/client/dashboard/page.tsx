'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClientBooking {
  id: string;
  status: string;
  amount: string;
  meeting_url: string | null;
  created_at: string;
  counselors: { display_name: string } | null;
  availability_slots: { start_time: string; end_time: string } | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  ailments: string | null;
  medical_notes: string | null;
}

export default function ClientDashboardPage() {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.replace('/login');
          router.refresh();
          return;
        }
        setUserEmail(user.email ?? null);

        const { data: profileRow } = await supabase
          .from('users_profile')
          .select('full_name, phone, date_of_birth, ailments, medical_notes')
          .eq('id', user.id)
          .single();
        if (!cancelled && profileRow) setProfile(profileRow as ClientProfile);

        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            amount,
            meeting_url,
            created_at,
            counselors(display_name),
            availability_slots(start_time, end_time)
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error('Error loading bookings:', error);
          setError('Failed to load bookings. Please try again.');
          setBookings([]);
          return;
        }
        setError('');
        const list = (data ?? []) as ClientBooking[];
        const upcoming = list.filter((b) => {
          const start = b.availability_slots?.start_time;
          return start && new Date(start) >= new Date(now);
        });
        const past = list.filter((b) => {
          const start = b.availability_slots?.start_time;
          return start && new Date(start) < new Date(now);
        });
        setBookings([...upcoming, ...past]);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading dashboard:', err);
          setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
          setBookings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  const upcomingBookings = bookings.filter((b) => {
    const start = b.availability_slots?.start_time;
    return start && new Date(start) >= new Date();
  });

  return (
    <main className="min-h-screen py-8 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card border border-border shadow rounded-lg p-6">
          <h1 className="font-headline text-3xl font-bold text-foreground mb-2">Client Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            {userEmail ? (
              <>Signed in as <span className="font-semibold text-foreground">{userEmail}</span></>
            ) : (
              'Welcome. Your bookings and sessions appear here.'
            )}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <section className="mb-8 rounded-lg border border-border bg-muted/30 p-6">
            <h2 className="font-headline text-xl font-semibold text-foreground mb-4">Your profile</h2>
            <p className="text-sm text-muted-foreground mb-4">Personal details and health context help your counselor support you.</p>
            {!profileEdit ? (
              <div>
                {profile?.full_name && <p className="text-muted-foreground"><span className="font-medium text-foreground">Name:</span> {profile.full_name}</p>}
                {profile?.phone && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Phone:</span> {profile.phone}</p>}
                {profile?.date_of_birth && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Date of birth:</span> {profile.date_of_birth}</p>}
                {profile?.ailments && <p className="text-muted-foreground mt-2 whitespace-pre-wrap"><span className="font-medium text-foreground">What I&apos;m dealing with:</span><br />{profile.ailments}</p>}
                {profile?.medical_notes && <p className="text-muted-foreground mt-2 whitespace-pre-wrap"><span className="font-medium text-foreground">Medical notes:</span><br />{profile.medical_notes}</p>}
                {!profile?.full_name && !profile?.phone && !profile?.date_of_birth && !profile?.ailments && !profile?.medical_notes && (
                  <p className="text-muted-foreground text-sm">No profile details yet.</p>
                )}
                <button type="button" onClick={() => setProfileEdit(true)} className="mt-2 text-sm font-medium text-primary hover:underline">Edit profile</button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const full_name = (form.querySelector('[name="full_name"]') as HTMLInputElement)?.value ?? '';
                  const phone = (form.querySelector('[name="phone"]') as HTMLInputElement)?.value ?? '';
                  const date_of_birth = (form.querySelector('[name="date_of_birth"]') as HTMLInputElement)?.value ?? '';
                  const ailments = (form.querySelector('[name="ailments"]') as HTMLTextAreaElement)?.value ?? '';
                  const medical_notes = (form.querySelector('[name="medical_notes"]') as HTMLTextAreaElement)?.value ?? '';
                  setProfileSaving(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const { data, error: updateError } = await supabase
                      .from('users_profile')
                      .update({ full_name: full_name || null, phone: phone || null, date_of_birth: date_of_birth || null, ailments: ailments || null, medical_notes: medical_notes || null })
                      .eq('id', user.id)
                      .select('full_name, phone, date_of_birth, ailments, medical_notes')
                      .single();
                    if (!updateError && data) { setProfile(data as ClientProfile); setProfileEdit(false); }
                  } finally { setProfileSaving(false); }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full name</label>
                  <input name="full_name" type="text" defaultValue={profile?.full_name ?? ''} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <input name="phone" type="tel" defaultValue={profile?.phone ?? ''} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Phone number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date of birth</label>
                  <input name="date_of_birth" type="date" defaultValue={profile?.date_of_birth ?? ''} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">What I&apos;m dealing with</label>
                  <textarea name="ailments" rows={3} defaultValue={profile?.ailments ?? ''} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="e.g. anxiety, stress, relationship issues" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Medical notes (for counselor)</label>
                  <textarea name="medical_notes" rows={3} defaultValue={profile?.medical_notes ?? ''} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Relevant health or medication info" />
                </div>
                <button type="submit" disabled={profileSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{profileSaving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setProfileEdit(false)} className="ml-2 rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
              </form>
            )}
          </section>

          <div className="mb-6">
            <Link
              href="/book"
              className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Book a session
            </Link>
          </div>

          <h2 className="font-headline text-xl font-semibold mb-6 text-foreground">Upcoming sessions</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-12 border border-border rounded-lg">
              <p className="text-muted-foreground text-lg">No upcoming sessions.</p>
              <p className="text-muted-foreground/80 text-sm mt-2">Book a session to get started.</p>
              <Link href="/book" className="inline-block mt-4 text-primary hover:underline font-medium">
                Book a session →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="border border-border rounded-lg p-6 hover:shadow-md transition bg-card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Counselor</p>
                      <h3 className="font-headline text-lg font-semibold text-foreground mb-2">
                        {booking.counselors?.display_name ?? '—'}
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Date & time:</span>{' '}
                          {booking.availability_slots?.start_time
                            ? new Date(booking.availability_slots.start_time).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}{' '}
                          –{' '}
                          {booking.availability_slots?.end_time
                            ? new Date(booking.availability_slots.end_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                        <p>
                          <span className="font-medium">Amount:</span> R{parseFloat(booking.amount || '0').toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'paid' || booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending_payment'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status === 'pending_payment'
                          ? 'Pending payment'
                          : String(booking.status).replace('_', ' ').toUpperCase()}
                      </span>
                      {booking.status === 'paid' || booking.status === 'confirmed' ? (
                        booking.meeting_url ? (
                          <a
                            href={booking.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                          >
                            Join meeting
                          </a>
                        ) : (
                          <span className="block mt-3 text-sm text-muted-foreground">Meeting link will appear soon</span>
                        )
                      ) : (
                        <span className="block mt-3 text-sm text-muted-foreground cursor-not-allowed select-none line-through">
                          Join meeting
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && bookings.length > upcomingBookings.length && (
            <div className="mt-10">
              <h2 className="font-headline text-lg font-semibold mb-4 text-foreground">Past sessions</h2>
              <p className="text-muted-foreground text-sm">You have {bookings.length - upcomingBookings.length} past session(s).</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
