import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

type SlotInput = {
  day_of_week: number;
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
};

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

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

