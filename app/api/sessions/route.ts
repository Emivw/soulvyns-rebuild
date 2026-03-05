import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

const SESSIONS_SETUP_MESSAGE =
  'Booking is not set up yet. Run sql/sessions_table.sql in Supabase SQL Editor.';

function isSessionsTableMissing(error: { message?: string } | null): boolean {
  const msg = error?.message ?? '';
  return msg.includes('sessions') && (msg.includes('does not exist') || msg.includes('relation'));
}

/**
 * POST /api/sessions
 * Body: { counselor_id, session_date, start_time, end_time }
 * Header: Authorization: Bearer <supabase_access_token>
 * Creates a session (booking). Validates slot is available and not double-booked.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const counselorId = body?.counselor_id;
    const sessionDate = body?.session_date;
    const startTime = body?.start_time;
    const endTime = body?.end_time;

    if (!counselorId || !sessionDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing counselor_id, session_date, start_time, or end_time' },
        { status: 400 }
      );
    }

    const startStr = String(startTime).slice(0, 5);
    const endStr = String(endTime).slice(0, 5);
    if (endStr <= startStr) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const dateStr = String(sessionDate).slice(0, 10);
    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid session_date' }, { status: 400 });
    }
    const dayOfWeek = (date.getDay() + 6) % 7;

    const { data: counselor } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('id', counselorId)
      .maybeSingle();

    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    }

    const { data: availability } = await supabaseAdmin
      .from('counselor_availability')
      .select('start_time, end_time')
      .eq('counselor_id', counselorId)
      .eq('day_of_week', dayOfWeek);

    const slotInRange = (availability ?? []).some((row) => {
      const aStart = String(row.start_time).slice(0, 5);
      const aEnd = String(row.end_time).slice(0, 5);
      return startStr >= aStart && endStr <= aEnd;
    });
    if (!slotInRange) {
      return NextResponse.json(
        { error: 'Selected time is not within counselor availability' },
        { status: 400 }
      );
    }

    const endFull = endStr.length === 5 ? `${endStr}:00` : endStr;
    const startFull = startStr.length === 5 ? `${startStr}:00` : startStr;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('counselor_id', counselorId)
      .eq('session_date', dateStr)
      .in('status', ['pending', 'confirmed'])
      .in('payment_status', ['pending', 'paid'])
      .lt('start_time', endFull)
      .gt('end_time', startFull);

    if (isSessionsTableMissing(existingError)) {
      return NextResponse.json({ error: SESSIONS_SETUP_MESSAGE }, { status: 503 });
    }
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'This slot is no longer available' },
        { status: 409 }
      );
    }

    const supabaseUser = createSupabaseServerClient(token);
    const { data: session, error: insertError } = await supabaseUser
      .from('sessions')
      .insert({
        client_id: user.id,
        counselor_id: counselorId,
        session_date: dateStr,
        start_time: startStr.length === 5 ? `${startStr}:00` : startStr,
        end_time: endStr.length === 5 ? `${endStr}:00` : endStr,
        status: 'pending',
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (isSessionsTableMissing(insertError)) {
      return NextResponse.json({ error: SESSIONS_SETUP_MESSAGE }, { status: 503 });
    }
    if (insertError) {
      const msg = insertError.message ?? 'Booking failed';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to create this booking.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }

    return NextResponse.json({ session_id: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
