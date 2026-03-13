import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

type SlotInput = {
  day_of_week: number;
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
};

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toMonday0DayOfWeek(utcDate: Date): number {
  // JS: 0=Sunday..6=Saturday. Our schema: 0=Monday..6=Sunday.
  return (utcDate.getUTCDay() + 6) % 7;
}

function parseTimeHHMM(s: string): { hh: number; mm: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function minutesSinceMidnight(t: { hh: number; mm: number }): number {
  return t.hh * 60 + t.mm;
}

function utcDateAtTime(baseUtc: Date, hh: number, mm: number): Date {
  return new Date(Date.UTC(baseUtc.getUTCFullYear(), baseUtc.getUTCMonth(), baseUtc.getUTCDate(), hh, mm, 0, 0));
}

function validateSlots(slots: SlotInput[]): string | null {
  for (const slot of slots) {
    if (
      typeof slot.day_of_week !== 'number' ||
      slot.day_of_week < 0 ||
      slot.day_of_week > 6
    ) {
      return 'Day of week must be between 0 (Monday) and 6 (Sunday).';
    }
    if (!slot.start_time || !slot.end_time) {
      return 'All slots must have a start and end time.';
    }
    if (slot.start_time >= slot.end_time) {
      return 'Each slot end time must be after its start time.';
    }
    if (!parseTimeHHMM(slot.start_time) || !parseTimeHHMM(slot.end_time)) {
      return 'Start and end times must be in HH:MM format.';
    }
  }

  const byDay: Record<number, SlotInput[]> = {};
  for (const slot of slots) {
    byDay[slot.day_of_week] ??= [];
    byDay[slot.day_of_week].push(slot);
  }

  for (const [dayStr, daySlots] of Object.entries(byDay)) {
    const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.start_time < prev.end_time) {
        return `Slots overlap on day ${dayStr}.`;
      }
    }
  }

  return null;
}

/**
 * GET /api/counselors/availability?email=...
 * Returns existing availability slots for the counselor.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const { data: counselor, error: counselorError } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('ms_graph_user_email', email)
      .maybeSingle();

    if (counselorError) {
      return NextResponse.json({ error: counselorError.message }, { status: 500 });
    }
    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('counselor_availability')
      .select('day_of_week, start_time, end_time')
      .eq('counselor_id', counselor.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      slots: (data ?? []).map((row) => ({
        day_of_week: row.day_of_week,
        start_time: String(row.start_time).slice(0, 5),
        end_time: String(row.end_time).slice(0, 5),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/counselors/availability
 * Body: { email: string, slots: SlotInput[] }
 * Replaces all availability for the counselor with the provided slots.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const slots: SlotInput[] = Array.isArray(body?.slots) ? body.slots : [];

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const validationError = validateSlots(slots);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: counselor, error: counselorError } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('ms_graph_user_email', email)
      .maybeSingle();

    if (counselorError) {
      return NextResponse.json({ error: counselorError.message }, { status: 500 });
    }
    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    }

    const counselorId = counselor.id;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const client = token ? createSupabaseServerClient(token) : supabaseAdmin;

    const { error: deleteError } = await client
      .from('counselor_availability')
      .delete()
      .eq('counselor_id', counselorId);

    if (deleteError) {
      const msg = deleteError.message ?? 'Failed to clear availability';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to update this availability.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }

    if (slots.length === 0) {
      return NextResponse.json({ success: true, slots: [] });
    }

    const rowsToInsert = slots.map((slot) => ({
      counselor_id: counselorId,
      day_of_week: slot.day_of_week,
      start_time: `${slot.start_time}:00`,
      end_time: `${slot.end_time}:00`,
    }));

    const { error: insertError } = await client
      .from('counselor_availability')
      .insert(rowsToInsert);

    if (insertError) {
      const msg = insertError.message ?? 'Failed to save availability';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to update this availability.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }

    // Generate concrete bookable slots for the next 30 days based on counselor_availability rules.
    // We only remove future *unbooked* slots before regenerating; booked slots remain intact.
    const nowUtc = new Date();
    const rangeStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 0, 0, 0, 0));
    const rangeEnd = addDaysUtc(rangeStart, 30);

    // Clear existing unbooked future slots in range to keep schedule consistent with new rules.
    const { error: clearSlotsError } = await supabaseAdmin
      .from('availability_slots')
      .delete()
      .eq('counselor_id', counselorId)
      .eq('is_booked', false)
      .gte('start_time', rangeStart.toISOString())
      .lt('start_time', rangeEnd.toISOString());

    if (clearSlotsError) {
      // Non-fatal: availability rules saved, but slot generation failed.
      return NextResponse.json(
        { success: true, warning: `Availability saved, but failed to clear old slots: ${clearSlotsError.message}` },
        { status: 200 }
      );
    }

    // Fetch existing slots (including booked) to prevent duplicates.
    const { data: existingSlots, error: existingSlotsError } = await supabaseAdmin
      .from('availability_slots')
      .select('start_time')
      .eq('counselor_id', counselorId)
      .gte('start_time', rangeStart.toISOString())
      .lt('start_time', rangeEnd.toISOString());

    if (existingSlotsError) {
      return NextResponse.json(
        { success: true, warning: `Availability saved, but failed to load existing slots: ${existingSlotsError.message}` },
        { status: 200 }
      );
    }

    const existingStartSet = new Set<string>(
      (existingSlots ?? [])
        .map((r) => (r as { start_time?: unknown }).start_time)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    );

    const slotsToInsert: { counselor_id: string; start_time: string; end_time: string }[] = [];

    for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
      const day = addDaysUtc(rangeStart, dayOffset);
      const dow = toMonday0DayOfWeek(day);
      const rulesForDay = slots.filter((s) => s.day_of_week === dow);
      if (rulesForDay.length === 0) continue;

      for (const rule of rulesForDay) {
        const start = parseTimeHHMM(rule.start_time);
        const end = parseTimeHHMM(rule.end_time);
        if (!start || !end) continue;

        const startMin = minutesSinceMidnight(start);
        const endMin = minutesSinceMidnight(end);

        for (let m = startMin; m + 60 <= endMin; m += 60) {
          const slotStart = utcDateAtTime(day, Math.floor(m / 60), m % 60);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
          const slotStartIso = slotStart.toISOString();
          if (existingStartSet.has(slotStartIso)) continue;
          existingStartSet.add(slotStartIso);
          slotsToInsert.push({
            counselor_id: counselorId,
            start_time: slotStartIso,
            end_time: slotEnd.toISOString(),
          });
        }
      }
    }

    if (slotsToInsert.length > 0) {
      const { error: slotInsertError } = await supabaseAdmin
        .from('availability_slots')
        .insert(slotsToInsert);

      if (slotInsertError) {
        return NextResponse.json(
          { success: true, warning: `Availability saved, but failed to generate slots: ${slotInsertError.message}` },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ success: true, generated_slots: slotsToInsert.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

