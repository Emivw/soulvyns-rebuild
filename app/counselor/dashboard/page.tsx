'use client';

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  status: string;
  amount: string;
  meeting_url: string | null;
  created_at: string;
  users_profile: {
    full_name: string;
    email: string;
  };
  availability_slots: {
    start_time: string;
    end_time: string;
  };
}

export default function CounselorDashboard() {
  const { accounts } = useMsal();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accounts.length > 0) {
      setEmail(accounts[0].username);
    } else {
      setLoading(false);
    }
  }, [accounts]);

  useEffect(() => {
    if (email) {
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const [error, setError] = useState('');
  const [counselorNotFound, setCounselorNotFound] = useState(false);
  const [profile, setProfile] = useState<{ bio?: string; accolades?: string; specializations?: string[] } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);

  useEffect(() => {
    if (!loading && accounts.length === 0) {
      router.replace('/login');
      router.refresh();
    }
  }, [loading, accounts.length, router]);

  const loadBookings = async () => {
    try {
      setError('');
      setCounselorNotFound(false);
      if (!email) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/counselors/bookings?email=${encodeURIComponent(email)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data && data.error) || 'Failed to load bookings');
      }

      setBookings(data.bookings || []);
      setCounselorNotFound(!!data.counselorNotFound);
      if (email) {
        const pr = await fetch(`/api/counselors/profile?email=${encodeURIComponent(email)}`);
        const prData = await pr.json().catch(() => ({}));
        if (prData.counselor) setProfile(prData.counselor);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings. Please try again.';
      console.error('Error loading bookings:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date().toISOString();
  const upcomingBookings = bookings.filter(
    (b) => b.availability_slots?.start_time && b.availability_slots.start_time >= now
  );
  const pastBookings = bookings.filter(
    (b) => b.availability_slots?.start_time && b.availability_slots.start_time < now
  );

  if (!loading && accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card border border-border shadow rounded-lg p-6">
          <h1 className="font-headline text-3xl font-bold text-foreground mb-2">Counselor Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Signed in as: <span className="font-semibold text-foreground">{email || 'Loading...'}</span>
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {counselorNotFound && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium">No counselor profile linked to this account.</p>
              <p className="text-amber-700 text-sm mt-1">
                You're signed in as <strong>{email}</strong>, but there is no counselor record for this email. Ask an administrator to add you as a counselor, or sign in with the account that was set up for counseling.
              </p>
            </div>
          )}

          {!counselorNotFound && (
            <section className="mb-8 rounded-lg border border-border bg-muted/30 p-6">
              <h2 className="font-headline text-xl font-semibold text-foreground mb-4">Your profile</h2>
              <p className="text-sm text-muted-foreground mb-4">Bio, accolades, and specializations help clients find you.</p>
              {!profileEdit ? (
                <div>
                  {profile?.bio && <p className="text-muted-foreground whitespace-pre-wrap mb-2">{profile.bio}</p>}
                  {profile?.accolades && <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{profile.accolades}</p>}
                  {profile?.specializations && profile.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {profile.specializations.map((s) => (
                        <span key={s} className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">{s}</span>
                      ))}
                    </div>
                  )}
                  {!profile?.bio && !profile?.accolades && (!profile?.specializations || profile.specializations.length === 0) && (
                    <p className="text-muted-foreground text-sm">No profile details yet.</p>
                  )}
                  <button type="button" onClick={() => setProfileEdit(true)} className="mt-2 text-sm font-medium text-primary hover:underline">Edit profile</button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const bio = (form.querySelector('[name="bio"]') as HTMLTextAreaElement)?.value ?? '';
                    const accolades = (form.querySelector('[name="accolades"]') as HTMLTextAreaElement)?.value ?? '';
                    const specRaw = (form.querySelector('[name="specializations"]') as HTMLInputElement)?.value ?? '';
                    const specializations = specRaw ? specRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
                    setProfileSaving(true);
                    try {
                      const res = await fetch('/api/counselors/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, bio, accolades, specializations }) });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.counselor) { setProfile(data.counselor); setProfileEdit(false); }
                    } finally { setProfileSaving(false); }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                    <textarea name="bio" rows={3} defaultValue={profile?.bio} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Short bio" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Accolades</label>
                    <textarea name="accolades" rows={2} defaultValue={profile?.accolades} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Credentials" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Specializations (comma-separated)</label>
                    <input name="specializations" type="text" defaultValue={profile?.specializations?.join(', ')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" placeholder="Anxiety, Depression" />
                  </div>
                  <button type="submit" disabled={profileSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{profileSaving ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={() => setProfileEdit(false)} className="ml-2 rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                </form>
              )}
              <p className="text-xs text-muted-foreground mt-4">Availability slots can be added by an administrator.</p>
            </section>
          )}

          <div className="mt-8">
            <h2 className="font-headline text-xl font-semibold mb-6 text-foreground">Upcoming sessions</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Loading bookings...</p>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-12 border border-gray-200 rounded-lg">
                <p className="text-gray-500 text-lg">No upcoming sessions.</p>
                <p className="text-gray-400 text-sm mt-2">Sessions will appear here once clients book with you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client</p>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {booking.users_profile?.full_name ?? '—'}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Email:</span> {booking.users_profile?.email ?? '—'}
                          </p>
                          <p>
                            <span className="font-medium">Date & Time:</span>{' '}
                            {new Date(booking.availability_slots.start_time).toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            - {new Date(booking.availability_slots.end_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p>
                            <span className="font-medium">Amount:</span> R{parseFloat(booking.amount).toFixed(2)}
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
                          {booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {booking.meeting_url && (
                          <a
                            href={booking.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pastBookings.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Past sessions</h2>
                <p className="text-gray-500 text-sm">You have {pastBookings.length} past session(s).</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
