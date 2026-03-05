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

  type DaySlot = { id: string; start: string; end: string };
  type AvailabilityState = Record<number, DaySlot[]>;
  const [availability, setAvailability] = useState<AvailabilityState>({});
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilitySuccess, setAvailabilitySuccess] = useState('');

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
  const [profile, setProfile] = useState<{ bio?: string; accolades?: string; specializations?: string[]; avatar_url?: string | null } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState('');

  useEffect(() => {
    if (!loading && accounts.length === 0) {
      router.replace('/login');
      router.refresh();
    }
  }, [loading, accounts.length, router]);

  function apiErrorMsg(res: Response, data: { error?: string }): string {
    const msg = data?.error ?? 'Request failed.';
    if (res.status === 403 || /permission|not authorized|access denied|RLS/i.test(msg)) {
      return 'You do not have permission to perform this action.';
    }
    return msg;
  }

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
        throw new Error(apiErrorMsg(response, data));
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setCounselorNotFound(!!data.counselorNotFound);
      if (email) {
        const pr = await fetch(`/api/counselors/profile?email=${encodeURIComponent(email)}`);
        const prData = await pr.json().catch(() => ({}));
        if (pr.ok && prData.counselor) setProfile(prData.counselor);
        if (!pr.ok) setError(apiErrorMsg(pr, prData));

        const avRes = await fetch(`/api/counselors/availability?email=${encodeURIComponent(email)}`);
        const avData = await avRes.json().catch(() => ({}));
        if (avRes.ok && Array.isArray(avData.slots)) {
          const byDay: AvailabilityState = {};
          avData.slots.forEach((slot: { day_of_week: number; start_time: string; end_time: string }) => {
            const day = Number(slot?.day_of_week);
            if (day < 0 || day > 6) return;
            byDay[day] ??= [];
            byDay[day].push({
              id: `${day}-${slot.start_time}-${slot.end_time}`,
              start: String(slot.start_time ?? ''),
              end: String(slot.end_time ?? ''),
            });
          });
          setAvailability(byDay);
        } else if (!avRes.ok) {
          setError(apiErrorMsg(avRes, avData));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard. Please try again.';
      console.error('Error loading counselor dashboard:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date().toISOString();
  const bookingsList = Array.isArray(bookings) ? bookings : [];
  const upcomingBookings = bookingsList.filter(
    (b) => b?.availability_slots?.start_time && b.availability_slots.start_time >= now
  );
  const pastBookings = bookingsList.filter(
    (b) => b?.availability_slots?.start_time && b.availability_slots.start_time < now
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
                  {profile?.avatar_url && (
                    <div className="mb-4">
                      <img src={profile.avatar_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border border-border" />
                    </div>
                  )}
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
                  <button type="button" onClick={() => { setProfileEdit(true); setAvatarFile(null); setAvatarPreview(null); setProfileSaveError(''); }} className="mt-2 text-sm font-medium text-primary hover:underline">Edit profile</button>
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
                    setProfileSaveError('');
                    try {
                      let avatarUrl: string | null = profile?.avatar_url ?? null;
                      if (avatarFile && email) {
                        const fd = new FormData();
                        fd.set('file', avatarFile);
                        fd.set('email', email);
                        const uploadRes = await fetch('/api/counselors/profile/avatar', { method: 'POST', body: fd });
                        const uploadData = await uploadRes.json().catch(() => ({}));
                        if (!uploadRes.ok) {
                          setProfileSaveError(uploadData.error || 'Failed to upload profile picture.');
                          return;
                        }
                        if (uploadData.avatar_url) avatarUrl = uploadData.avatar_url;
                      }
                      const res = await fetch('/api/counselors/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, bio, accolades, specializations, avatar_url: avatarUrl }) });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.counselor) { setProfile(data.counselor); setProfileEdit(false); }
                      else setProfileSaveError(res.status === 403 ? 'You do not have permission to update this profile.' : (data.error || 'Failed to save profile.'));
                    } finally { setProfileSaving(false); }
                  }}
                  className="space-y-4"
                >
                  {profileSaveError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-destructive text-sm">{profileSaveError}</p>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row items-start gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Current" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground text-center px-2">Photo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label htmlFor="counselor-avatar" className="block text-sm font-medium text-foreground mb-1">
                        Profile picture (optional)
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        JPG, PNG, WebP or GIF. Max 5MB.
                      </p>
                      <input
                        id="counselor-avatar"
                        name="avatar"
                        type="file"
                        accept="image/*"
                        className="text-sm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) { setAvatarFile(null); setAvatarPreview(null); return; }
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }}
                      />
                    </div>
                  </div>
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

          {!counselorNotFound && (
            <section className="mb-8 rounded-lg border border-border bg-muted/30 p-6">
              <h2 className="font-headline text-xl font-semibold text-foreground mb-2">My Availability</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Set the times you are available for sessions on each day. Clients can only be booked into these windows.
              </p>
              {availabilityError && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {availabilityError}
                </div>
              )}
              {availabilitySuccess && (
                <div className="mb-4 rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {availabilitySuccess}
                </div>
              )}
              <div className="space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (label, index) => {
                    const day = index; // 0 = Monday
                    const slots = availability[day] ?? [];
                    return (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-background/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setAvailabilityError('');
                              setAvailabilitySuccess('');
                              setAvailability((prev) => ({
                                ...prev,
                                [day]: [
                                  ...(prev[day] ?? []),
                                  {
                                    id: `${day}-${Date.now()}-${(prev[day] ?? []).length}`,
                                    start: '09:00',
                                    end: '17:00',
                                  },
                                ],
                              }));
                            }}
                            className="rounded border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
                          >
                            + Add Time Slot
                          </button>
                        </div>
                        {slots.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No availability set for this day.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {slots.map((slot) => (
                              <div
                                key={slot.id}
                                className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/40 p-3 md:flex-row md:items-center"
                              >
                                <div className="flex flex-1 items-center gap-2">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Start
                                  </label>
                                  <input
                                    type="time"
                                    value={slot.start}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setAvailabilityError('');
                                      setAvailabilitySuccess('');
                                      setAvailability((prev) => ({
                                        ...prev,
                                        [day]: (prev[day] ?? []).map((s) =>
                                          s.id === slot.id ? { ...s, start: value } : s,
                                        ),
                                      }));
                                    }}
                                    className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                  />
                                  <label className="text-xs font-medium text-muted-foreground">
                                    End
                                  </label>
                                  <input
                                    type="time"
                                    value={slot.end}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setAvailabilityError('');
                                      setAvailabilitySuccess('');
                                      setAvailability((prev) => ({
                                        ...prev,
                                        [day]: (prev[day] ?? []).map((s) =>
                                          s.id === slot.id ? { ...s, end: value } : s,
                                        ),
                                      }));
                                    }}
                                    className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAvailabilityError('');
                                    setAvailabilitySuccess('');
                                    setAvailability((prev) => ({
                                      ...prev,
                                      [day]: (prev[day] ?? []).filter((s) => s.id !== slot.id),
                                    }));
                                  }}
                                  className="self-start rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={availabilitySaving}
                  onClick={async () => {
                    setAvailabilityError('');
                    setAvailabilitySuccess('');
                    if (!email) {
                      setAvailabilityError('Email missing. Please sign in again.');
                      return;
                    }
                    const allSlots: { day_of_week: number; start_time: string; end_time: string }[] = [];
                    Object.entries(availability).forEach(([dayStr, slots]) => {
                      const day = Number(dayStr);
                      slots.forEach((slot) => {
                        if (slot.start && slot.end) {
                          allSlots.push({
                            day_of_week: day,
                            start_time: slot.start,
                            end_time: slot.end,
                          });
                        }
                      });
                    });

                    for (const slot of allSlots) {
                      if (slot.end_time <= slot.start_time) {
                        setAvailabilityError('Each slot end time must be after its start time.');
                        return;
                      }
                    }

                    const byDay: Record<number, { start: string; end: string }[]> = {};
                    allSlots.forEach((slot) => {
                      byDay[slot.day_of_week] ??= [];
                      byDay[slot.day_of_week].push({
                        start: slot.start_time,
                        end: slot.end_time,
                      });
                    });
                    for (const [dayStr, slots] of Object.entries(byDay)) {
                      const sorted = [...slots].sort((a, b) =>
                        a.start.localeCompare(b.start),
                      );
                      for (let i = 1; i < sorted.length; i += 1) {
                        const prev = sorted[i - 1];
                        const curr = sorted[i];
                        if (curr.start < prev.end) {
                          setAvailabilityError(
                            `Slots overlap on ${[
                              'Monday',
                              'Tuesday',
                              'Wednesday',
                              'Thursday',
                              'Friday',
                              'Saturday',
                              'Sunday',
                            ][Number(dayStr)]}.`,
                          );
                          return;
                        }
                      }
                    }

                    setAvailabilitySaving(true);
                    try {
                      const res = await fetch('/api/counselors/availability', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, slots: allSlots }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setAvailabilityError(
                          res.status === 403 ? 'You do not have permission to update availability.' : (data.error || 'Failed to save availability. Please try again.'),
                        );
                      } else {
                        setAvailabilitySuccess('Availability saved.');
                      }
                    } finally {
                      setAvailabilitySaving(false);
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {availabilitySaving ? 'Saving...' : 'Save Availability'}
                </button>
                <p className="text-xs text-muted-foreground">
                  You can update these times at any point to adjust your schedule.
                </p>
              </div>
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
