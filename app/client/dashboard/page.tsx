'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClientBooking {
  id: string;
  slot_id?: string;
  status: string;
  amount: string;
  meeting_url: string | null;
  created_at: string;
  counselors: { display_name: string }[] | null;
  availability_slots: { start_time: string; end_time: string }[] | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  ailments: string | null;
  medical_notes: string | null;
  avatar_url?: string | null;
}

export default function ClientDashboardPage() {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [formErrors, setFormErrors] = useState<{
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
  }>({});
  const [formState, setFormState] = useState<{
    full_name: string;
    phone: string;
    date_of_birth: string;
    ailments: string;
    medical_notes: string;
    avatar_url: string;
  }>({
    full_name: '',
    phone: '',
    date_of_birth: '',
    ailments: '',
    medical_notes: '',
    avatar_url: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const router = useRouter();

  function friendlyMessage(err: unknown): string {
    // Normalize to a human string and avoid leaking raw objects like "[object Object]"
    if (err instanceof Error) {
      const msg = err.message || 'Something went wrong. Please try again.';
      if (/policy|permission|row level security|RLS|access denied|not authorized/i.test(msg)) {
        return 'You do not have access to this data. Please sign in again.';
      }
      return msg;
    }

    if (typeof err === 'string') {
      if (/policy|permission|row level security|RLS|access denied|not authorized/i.test(err)) {
        return 'You do not have access to this data. Please sign in again.';
      }
      return err || 'Something went wrong. Please try again.';
    }

    // Any non-string, non-Error (like {}) becomes a generic message
    return 'Something went wrong. Please try again.';
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = session?.user ?? null;
        if (!user) {
          router.replace('/login');
          router.refresh();
          return;
        }
        setUserEmail(user.email ?? null);

        const { data: profileRow, error: profileError } = await supabase
          .from('users_profile')
          .select('full_name, phone, date_of_birth, ailments, medical_notes, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled && profileRow) setProfile(profileRow as ClientProfile);
        const hasProfileError =
          !!profileError && typeof (profileError as any).message === 'string';
        if (!cancelled && hasProfileError) {
          console.error('Profile load error:', profileError);
          setError(friendlyMessage((profileError as any).message));
        }

        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            slot_id,
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
          setError(friendlyMessage(error));
          setBookings([]);
          return;
        }
        if (!cancelled && !hasProfileError) setError('');
        const listRaw = Array.isArray(data) ? (data as any[]) : [];

        // Fallback fetch of slots for any bookings missing availability_slots relation
        const missingSlotIds = listRaw
          .filter((b) => {
            const rel = (b as any).availability_slots;
            return !rel || (Array.isArray(rel) && rel.length === 0);
          })
          .map((b) => (b as any).slot_id)
          .filter((id) => typeof id === 'string');

        let slotMap: Record<string, { start_time: string; end_time: string }> = {};
        if (missingSlotIds.length > 0) {
          const { data: slots, error: slotsError } = await supabase
            .from('availability_slots')
            .select('id, start_time, end_time')
            .in('id', missingSlotIds);
          if (slotsError) {
            console.error('Error loading slots for client dashboard bookings:', slotsError);
          } else if (Array.isArray(slots)) {
            slotMap = Object.fromEntries(
              slots.map((s: any) => [s.id, { start_time: s.start_time, end_time: s.end_time }]),
            );
          }
        }

        const list: ClientBooking[] = listRaw.map((b) => {
          const rel = (b as any).availability_slots;
          let slots =
            Array.isArray(rel) && rel.length > 0
              ? rel
              : rel
              ? [rel]
              : (slotMap[(b as any).slot_id] ? [slotMap[(b as any).slot_id]] : []);
          return {
            ...(b as ClientBooking),
            availability_slots: slots,
          };
        });
        const upcoming = list.filter((b) => {
          const start = b?.availability_slots?.[0]?.start_time;
          return start && new Date(start) >= new Date(now);
        });
        const past = list.filter((b) => {
          const start = b?.availability_slots?.[0]?.start_time;
          return start && new Date(start) < new Date(now);
        });
        setBookings([...upcoming, ...past]);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading dashboard:', err);
          setError(friendlyMessage(err));
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
    const start = b.availability_slots?.[0]?.start_time;
    return start && new Date(start) >= new Date();
  });

  function startEditProfile() {
    setFormErrors({});
    setProfileSaveError('');
    setFormState({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      date_of_birth: profile?.date_of_birth ?? '',
      ailments: profile?.ailments ?? '',
      medical_notes: profile?.medical_notes ?? '',
      avatar_url: profile?.avatar_url ?? '',
    });
    setAvatarPreview(null);
    setAvatarFile(null);
    setProfileEdit(true);
  }

  // Update age when date of birth changes in the form
  useEffect(() => {
    if (!formState.date_of_birth) {
      setCalculatedAge(null);
      return;
    }
    const dob = new Date(formState.date_of_birth);
    if (Number.isNaN(dob.getTime())) {
      setCalculatedAge(null);
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 0 || age > 120) {
      setCalculatedAge(null);
    } else {
      setCalculatedAge(age);
    }
  }, [formState.date_of_birth]);

  async function handleProfileSave() {
    const errors: typeof formErrors = {};
    if (!formState.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    }
    if (!formState.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required.';
    }
    if (formState.phone && !/^[0-9+()\-\s]{6,}$/.test(formState.phone.trim())) {
      errors.phone = 'Please enter a valid phone number.';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProfileSaving(true);
    setProfileSaveError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      let avatarUrl: string | null = profile?.avatar_url ?? null;
      if (avatarFile) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setProfileSaveError('Session expired. Please sign in again.');
          return;
        }
        const fd = new FormData();
        fd.set('file', avatarFile);
        const uploadRes = await fetch('/api/client/profile/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          setProfileSaveError(uploadData.error || 'Failed to upload profile picture.');
          return;
        }
        if (uploadData.avatar_url) avatarUrl = uploadData.avatar_url;
      }

      // Normalise date string so Postgres DATE accepts it (e.g. turn 2000/03/07 into 2000-03-07)
      const normalizedDob = formState.date_of_birth
        ? formState.date_of_birth.trim().replace(/\//g, '-')
        : '';

      const payload = {
        id: user.id,
        email: user.email ?? '',
        role: 'client',
        full_name: formState.full_name.trim() || null,
        phone: formState.phone.trim() || null,
        date_of_birth: normalizedDob || null,
        ailments: formState.ailments.trim() || null,
        medical_notes: formState.medical_notes.trim() || null,
        avatar_url: avatarUrl,
      };

      const { data, error: saveError } = await supabase
        .from('users_profile')
        .upsert(payload, { onConflict: 'id' })
        .select('full_name, phone, date_of_birth, ailments, medical_notes, avatar_url')
        .single();

      if (saveError) {
        const msg = saveError.message ?? 'Failed to save profile.';
        console.error('Profile save error:', saveError);
        setProfileSaveError(/policy|permission|row level security|RLS/i.test(msg) ? 'You do not have permission to update this profile. Please sign in again.' : msg);
        return;
      }
      if (data) {
        setProfile(data as ClientProfile);
        setProfileEdit(false);
      }
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <main className="min-h-screen py-8 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card border border-border shadow rounded-lg p-6">
          <h1 className="font-headline text-3xl font-bold text-foreground mb-2">Client Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            {userEmail ? (
              <>
                Signed in as <span className="font-semibold text-foreground">{userEmail}</span>
              </>
            ) : (
              'Welcome. Your bookings and sessions appear here.'
            )}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            {/* Main profile form column */}
            <section className="rounded-lg border border-border bg-muted/30 p-6">
            <h2 className="font-headline text-xl font-semibold text-foreground mb-4">Your profile</h2>
            <p className="text-sm text-muted-foreground mb-4">Personal details and health context help your counselor support you.</p>
            {profileSaveError && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive text-sm">{profileSaveError}</p>
              </div>
            )}
            {!profileEdit ? (
              <div>
                {profile?.avatar_url && (
                  <div className="mb-4">
                    <img src={profile.avatar_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border border-border" />
                  </div>
                )}
                {profile?.full_name && <p className="text-muted-foreground"><span className="font-medium text-foreground">Name:</span> {profile.full_name}</p>}
                {profile?.phone && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Phone:</span> {profile.phone}</p>}
                {profile?.date_of_birth && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Date of birth:</span> {profile.date_of_birth}</p>}
                {profile?.ailments && <p className="text-muted-foreground mt-2 whitespace-pre-wrap"><span className="font-medium text-foreground">What I&apos;m dealing with:</span><br />{profile.ailments}</p>}
                {profile?.medical_notes && <p className="text-muted-foreground mt-2 whitespace-pre-wrap"><span className="font-medium text-foreground">Medical notes:</span><br />{profile.medical_notes}</p>}
                {!profile?.full_name && !profile?.phone && !profile?.date_of_birth && !profile?.ailments && !profile?.medical_notes && (
                  <p className="text-muted-foreground text-sm">No profile details yet.</p>
                )}
                <button
                  type="button"
                  onClick={startEditProfile}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Edit profile
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProfileSave();
                }}
                className="space-y-5"
              >
                {/* Profile picture */}
                <div className="flex flex-col md:flex-row items-start gap-4 rounded-lg border border-dashed border-border bg-card/40 p-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">Profile photo</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label htmlFor="avatar" className="block text-sm font-medium text-foreground mb-1">
                      Profile picture (optional)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add a photo so your counselor can put a face to your name. JPG or PNG, up to 5MB.
                    </p>
                    <input
                      id="avatar"
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
                  <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formState.full_name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    placeholder="e.g. Thato Mokoena"
                  />
                  {formErrors.full_name && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.full_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formState.phone}
                    onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    placeholder="+27 82 123 4567"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
                    Date of birth
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formState.date_of_birth}
                    onChange={(e) => setFormState((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {calculatedAge !== null ? `Age: ${calculatedAge} years` : 'We use this to help match you to the right support.'}
                  </p>
                  {formErrors.date_of_birth && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.date_of_birth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ailments" className="block text-sm font-medium text-foreground mb-1">
                    What I&apos;m dealing with
                  </label>
                  <textarea
                    id="ailments"
                    name="ailments"
                    rows={3}
                    value={formState.ailments}
                    onChange={(e) => setFormState((prev) => ({ ...prev, ailments: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    placeholder="e.g. anxiety, burnout, relationship stress"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. A short summary helps your counselor prepare for your session.
                  </p>
                </div>

                <div>
                  <label htmlFor="medical_notes" className="block text-sm font-medium text-foreground mb-1">
                    Medical notes (optional)
                  </label>
                  <textarea
                    id="medical_notes"
                    name="medical_notes"
                    rows={3}
                    value={formState.medical_notes}
                    onChange={(e) => setFormState((prev) => ({ ...prev, medical_notes: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    placeholder="e.g. current medication, relevant diagnoses, or anything your counselor should know."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. Only share what you&apos;re comfortable with. This is visible to your counselor for context.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileEdit(false)}
                    className="rounded-lg border border-transparent px-4 py-2 text-sm text-muted-foreground hover:bg-muted/40"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            </section>

            {/* Sidebar column */}
            <aside className="rounded-lg border border-border bg-muted/20 p-5 lg:sticky lg:top-4 flex flex-col gap-6">
              {/* Profile summary */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile?.full_name
                      ? profile.full_name.charAt(0).toUpperCase()
                      : userEmail
                      ? userEmail.charAt(0).toUpperCase()
                      : '?'
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {profile?.full_name || 'Your profile'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userEmail || 'Complete your profile to get started.'}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={startEditProfile}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40"
                >
                  Edit profile
                </button>
                <Link
                  href="/book"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Book a session
                </Link>
                <Link
                  href="/my-bookings"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40 transition"
                >
                  My bookings
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
                >
                  Logout
                </button>
              </div>
            </aside>
          </div>

          <h2 className="font-headline text-xl font-semibold mt-10 mb-6 text-foreground">
            Upcoming sessions
          </h2>
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
                        {booking.counselors?.[0]?.display_name ?? '—'}
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Date & time:</span>{' '}
                          {booking.availability_slots?.[0]?.start_time
                            ? new Date(booking.availability_slots[0].start_time).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}{' '}
                          –{' '}
                          {booking.availability_slots?.[0]?.end_time
                            ? new Date(booking.availability_slots[0].end_time).toLocaleTimeString('en-US', {
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
